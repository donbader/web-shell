import { WebSocket } from 'ws';
import logger from '../utils/logger.js';
import resourceMonitor from './resourceMonitor.js';
import { SystemStats } from './resourceMonitor.js';

/**
 * Resource streaming configuration
 */
interface StreamConfig {
  updateInterval: number; // milliseconds
  cacheTimeout: number; // milliseconds
  enableDeltaCompression: boolean;
}

/**
 * Default streaming configuration
 */
const DEFAULT_CONFIG: StreamConfig = {
  updateInterval: 1000, // 1 second (faster than 2s polling)
  cacheTimeout: 500, // Cache for 500ms to reduce Docker API calls
  enableDeltaCompression: true,
};

/**
 * Cached stats with timestamp
 */
interface CachedStats {
  stats: SystemStats;
  timestamp: number;
}

/**
 * WebSocket message types for resource streaming
 */
interface ResourceStreamMessage {
  type: 'subscribe' | 'unsubscribe' | 'configure';
  config?: Partial<StreamConfig>;
}

interface ResourceUpdateMessage {
  type: 'resource-update' | 'resource-delta' | 'error';
  data?: SystemStats | Partial<SystemStats>;
  error?: string;
  timestamp: number;
}

/**
 * ResourceStreamer manages real-time resource monitoring via WebSocket
 * Provides efficient streaming with caching and delta compression
 */
class ResourceStreamer {
  private subscribers: Set<WebSocket> = new Set();
  private streamInterval: NodeJS.Timeout | null = null;
  private cachedStats: CachedStats | null = null;
  private config: StreamConfig = { ...DEFAULT_CONFIG };
  private lastBroadcastStats: SystemStats | null = null;

  /**
   * Subscribe a WebSocket client to resource updates
   */
  subscribe(ws: WebSocket, initialConfig?: Partial<StreamConfig>): void {
    // Apply custom configuration if provided
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }

    this.subscribers.add(ws);
    logger.info('Resource monitoring client subscribed', {
      totalSubscribers: this.subscribers.size,
    });

    // Send immediate update to new subscriber
    this.sendUpdateToClient(ws).catch(err => {
      logger.error('Failed to send initial resource update', { error: err });
    });

    // Start streaming if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startStreaming();
    }

    // Handle client disconnect
    ws.on('close', () => {
      this.unsubscribe(ws);
    });

    // Handle configuration updates
    ws.on('message', (data: Buffer) => {
      try {
        const message: ResourceStreamMessage = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        logger.warn('Invalid resource stream message', { error });
      }
    });
  }

  /**
   * Unsubscribe a WebSocket client from resource updates
   */
  unsubscribe(ws: WebSocket): void {
    this.subscribers.delete(ws);
    logger.info('Resource monitoring client unsubscribed', {
      totalSubscribers: this.subscribers.size,
    });

    // Stop streaming if no subscribers
    if (this.subscribers.size === 0) {
      this.stopStreaming();
    }
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: ResourceStreamMessage): void {
    switch (message.type) {
      case 'subscribe':
        // Already subscribed, just update config if provided
        if (message.config) {
          this.updateConfig(message.config);
        }
        break;

      case 'unsubscribe':
        this.unsubscribe(ws);
        break;

      case 'configure':
        if (message.config) {
          this.updateConfig(message.config);
          // Restart streaming with new configuration
          if (this.subscribers.size > 0) {
            this.stopStreaming();
            this.startStreaming();
          }
        }
        break;

      default:
        logger.warn('Unknown resource stream message type', { type: (message as any).type });
    }
  }

  /**
   * Update streaming configuration
   */
  private updateConfig(newConfig: Partial<StreamConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    logger.info('Resource streaming configuration updated', this.config);
  }

  /**
   * Start streaming resource updates to subscribers
   */
  private startStreaming(): void {
    if (this.streamInterval) {
      return; // Already streaming
    }

    logger.info('Starting resource streaming', {
      updateInterval: this.config.updateInterval,
      cacheTimeout: this.config.cacheTimeout,
    });

    this.streamInterval = setInterval(() => {
      this.broadcastUpdates().catch(err => {
        logger.error('Failed to broadcast resource updates', { error: err });
      });
    }, this.config.updateInterval);
  }

  /**
   * Stop streaming resource updates
   */
  private stopStreaming(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
      this.cachedStats = null;
      this.lastBroadcastStats = null;
      logger.info('Resource streaming stopped');
    }
  }

  /**
   * Get stats with caching to reduce Docker API calls
   */
  private async getCachedStats(): Promise<SystemStats> {
    const now = Date.now();

    // Return cached stats if still valid
    if (this.cachedStats && (now - this.cachedStats.timestamp) < this.config.cacheTimeout) {
      return this.cachedStats.stats;
    }

    // Fetch fresh stats
    const stats = await resourceMonitor.getSystemStats();
    this.cachedStats = { stats, timestamp: now };
    return stats;
  }

  /**
   * Calculate delta between current and previous stats
   */
  private calculateDelta(current: SystemStats, previous: SystemStats | null): Partial<SystemStats> | SystemStats {
    if (!previous || !this.config.enableDeltaCompression) {
      return current; // Return full stats if no previous or delta disabled
    }

    const delta: Partial<SystemStats> = {
      timestamp: current.timestamp,
    };

    let hasChanges = false;

    // Check backend changes
    if (JSON.stringify(current.backend) !== JSON.stringify(previous.backend)) {
      delta.backend = current.backend;
      hasChanges = true;
    }

    // Check frontend changes
    if (JSON.stringify(current.frontend) !== JSON.stringify(previous.frontend)) {
      delta.frontend = current.frontend;
      hasChanges = true;
    }

    // Check summary changes
    if (JSON.stringify(current.summary) !== JSON.stringify(previous.summary)) {
      delta.summary = current.summary;
      hasChanges = true;
    }

    // Check sessions changes (always include for simplicity, could be optimized further)
    if (JSON.stringify(current.sessions) !== JSON.stringify(previous.sessions)) {
      delta.sessions = current.sessions;
      hasChanges = true;
    }

    // If no changes, return empty delta with just timestamp
    return hasChanges ? delta : { timestamp: current.timestamp };
  }

  /**
   * Broadcast updates to all subscribers
   */
  private async broadcastUpdates(): Promise<void> {
    if (this.subscribers.size === 0) {
      return;
    }

    try {
      const stats = await this.getCachedStats();
      const delta = this.calculateDelta(stats, this.lastBroadcastStats);

      const message: ResourceUpdateMessage = {
        type: this.config.enableDeltaCompression && this.lastBroadcastStats
          ? 'resource-delta'
          : 'resource-update',
        data: delta,
        timestamp: Date.now(),
      };

      // Broadcast to all connected clients
      const disconnectedClients: WebSocket[] = [];

      this.subscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
            logger.error('Failed to send resource update to client', { error });
            disconnectedClients.push(ws);
          }
        } else {
          disconnectedClients.push(ws);
        }
      });

      // Clean up disconnected clients
      disconnectedClients.forEach(ws => this.unsubscribe(ws));

      // Update last broadcast stats for delta calculation
      this.lastBroadcastStats = stats;

    } catch (error) {
      logger.error('Failed to fetch resource stats for streaming', { error });

      // Send error to all subscribers
      const errorMessage: ResourceUpdateMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch resource stats',
        timestamp: Date.now(),
      };

      this.subscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(errorMessage));
          } catch (err) {
            // Ignore send errors
          }
        }
      });
    }
  }

  /**
   * Send immediate update to a specific client
   */
  private async sendUpdateToClient(ws: WebSocket): Promise<void> {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const stats = await this.getCachedStats();
      const message: ResourceUpdateMessage = {
        type: 'resource-update',
        data: stats,
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send resource update to client', { error });

      const errorMessage: ResourceUpdateMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch resource stats',
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(errorMessage));
    }
  }

  /**
   * Get current streaming statistics
   */
  getStreamingStats(): {
    subscribers: number;
    isStreaming: boolean;
    config: StreamConfig;
    cacheAge: number | null;
  } {
    return {
      subscribers: this.subscribers.size,
      isStreaming: this.streamInterval !== null,
      config: this.config,
      cacheAge: this.cachedStats ? Date.now() - this.cachedStats.timestamp : null,
    };
  }
}

// Export singleton instance
const resourceStreamer = new ResourceStreamer();
export default resourceStreamer;
