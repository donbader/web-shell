import { WebSocket } from 'ws';
import logger from '../utils/logger.js';
import resourceMonitor from './resourceMonitor.js';
import { SystemStats } from './resourceMonitor.js';

/**
 * ResourceStreamer - Simple WebSocket-based resource monitoring
 * Pushes stats to connected clients every second
 */
class ResourceStreamer {
  private subscribers: Set<WebSocket> = new Set();
  private streamInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 1000; // 1 second

  /**
   * Subscribe a WebSocket client to resource updates
   */
  subscribe(ws: WebSocket): void {
    this.subscribers.add(ws);
    logger.info('Resource client connected', { total: this.subscribers.size });

    // Send immediate update
    this.sendUpdate(ws).catch(() => {
      // Client may have disconnected
    });

    // Start streaming if first subscriber
    if (this.subscribers.size === 1) {
      this.startStreaming();
    }

    // Auto-cleanup on disconnect
    ws.on('close', () => this.unsubscribe(ws));
  }

  /**
   * Unsubscribe a WebSocket client
   */
  private unsubscribe(ws: WebSocket): void {
    this.subscribers.delete(ws);
    logger.info('Resource client disconnected', { total: this.subscribers.size });

    // Stop streaming if no subscribers
    if (this.subscribers.size === 0) {
      this.stopStreaming();
    }
  }

  /**
   * Start streaming updates to all subscribers
   */
  private startStreaming(): void {
    if (this.streamInterval) return;

    logger.info('Resource streaming started');
    this.streamInterval = setInterval(() => {
      this.broadcastUpdates();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop streaming updates
   */
  private stopStreaming(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
      logger.info('Resource streaming stopped');
    }
  }

  /**
   * Broadcast stats to all connected clients
   */
  private async broadcastUpdates(): Promise<void> {
    try {
      const stats = await resourceMonitor.getSystemStats();
      const message = JSON.stringify({
        type: 'resource-update',
        data: stats,
        timestamp: Date.now(),
      });

      // Send to all connected clients
      const disconnected: WebSocket[] = [];
      for (const ws of this.subscribers) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          disconnected.push(ws);
        }
      }

      // Cleanup disconnected clients
      disconnected.forEach(ws => this.unsubscribe(ws));
    } catch (error) {
      logger.error('Failed to broadcast resource updates', { error });
    }
  }

  /**
   * Send immediate update to a specific client
   */
  private async sendUpdate(ws: WebSocket): Promise<void> {
    if (ws.readyState !== WebSocket.OPEN) return;

    try {
      const stats = await resourceMonitor.getSystemStats();
      ws.send(JSON.stringify({
        type: 'resource-update',
        data: stats,
        timestamp: Date.now(),
      }));
    } catch (error) {
      logger.error('Failed to send resource update', { error });
    }
  }
}

export default new ResourceStreamer();
