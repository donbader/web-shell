import { getApiUrl } from '../utils/apiUrl.js';
import type { SystemStats } from '../types/resources.js';

/**
 * Resource update callback type
 */
type ResourceUpdateCallback = (stats: SystemStats) => void;
type ErrorCallback = (error: string) => void;

/**
 * WebSocket message types
 */
interface ResourceUpdateMessage {
  type: 'resource-update' | 'resource-delta' | 'error';
  data?: SystemStats | Partial<SystemStats>;
  error?: string;
  timestamp: number;
}

interface StreamConfig {
  updateInterval?: number;
  enableDeltaCompression?: boolean;
}

/**
 * ResourceWebSocket manages real-time resource monitoring via WebSocket
 * Replaces HTTP polling with push-based updates for better performance
 */
export class ResourceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private updateCallback: ResourceUpdateCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private isIntentionallyClosed: boolean = false;
  private currentStats: SystemStats | null = null;

  /**
   * Connect to resource monitoring WebSocket
   */
  connect(
    onUpdate: ResourceUpdateCallback,
    onError?: ErrorCallback,
    config?: StreamConfig
  ): void {
    this.updateCallback = onUpdate;
    this.errorCallback = onError || null;
    this.isIntentionallyClosed = false;

    const apiUrl = getApiUrl();
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/resources';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Resource monitoring WebSocket connected');
        this.reconnectAttempts = 0;

        // Send configuration if provided
        if (config) {
          this.configure(config);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ResourceUpdateMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('Resource monitoring WebSocket error:', event);
        if (this.errorCallback) {
          this.errorCallback('WebSocket connection error');
        }
      };

      this.ws.onclose = (event) => {
        console.log('Resource monitoring WebSocket closed', {
          code: event.code,
          reason: event.reason,
        });

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (this.errorCallback) {
        this.errorCallback(
          error instanceof Error ? error.message : 'Failed to create WebSocket'
        );
      }
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: ResourceUpdateMessage): void {
    switch (message.type) {
      case 'resource-update':
        // Full stats update
        if (message.data) {
          this.currentStats = message.data as SystemStats;
          if (this.updateCallback) {
            this.updateCallback(this.currentStats);
          }
        }
        break;

      case 'resource-delta':
        // Delta update - merge with current stats
        if (message.data && this.currentStats) {
          this.currentStats = {
            ...this.currentStats,
            ...message.data,
            timestamp: message.timestamp,
          };
          if (this.updateCallback) {
            this.updateCallback(this.currentStats);
          }
        } else if (message.data) {
          // First delta received, treat as full update
          this.currentStats = message.data as SystemStats;
          if (this.updateCallback) {
            this.updateCallback(this.currentStats);
          }
        }
        break;

      case 'error':
        console.error('Resource monitoring error:', message.error);
        if (this.errorCallback && message.error) {
          this.errorCallback(message.error);
        }
        break;

      default:
        console.warn('Unknown WebSocket message type:', (message as any).type);
    }
  }

  /**
   * Configure streaming parameters
   */
  configure(config: StreamConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'configure',
          config,
        })
      );
    }
  }

  /**
   * Attempt to reconnect after connection loss
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.errorCallback) {
        this.errorCallback(
          'Failed to reconnect after ' + this.maxReconnectAttempts + ' attempts'
        );
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(
      `Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.updateCallback) {
        this.connect(this.updateCallback, this.errorCallback || undefined);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'unsubscribe',
          })
        );
      }
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.currentStats = null;
    this.reconnectAttempts = 0;
    console.log('Resource monitoring WebSocket disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current stats (last received)
   */
  getCurrentStats(): SystemStats | null {
    return this.currentStats;
  }
}

// Export singleton instance for convenience
export const resourceWebSocket = new ResourceWebSocket();
