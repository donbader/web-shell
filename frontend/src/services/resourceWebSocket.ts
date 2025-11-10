import { getApiUrl } from '../utils/apiUrl.js';
import type { SystemStats } from '../types/resources.js';

/**
 * Simple WebSocket client for real-time resource monitoring
 */
export class ResourceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 2000;
  private onUpdate: ((stats: SystemStats) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  /**
   * Connect to resource monitoring WebSocket
   */
  connect(
    updateCallback: (stats: SystemStats) => void,
    errorCallback?: (error: string) => void
  ): void {
    this.onUpdate = updateCallback;
    this.onError = errorCallback || null;

    const wsUrl = getApiUrl().replace(/^http/, 'ws') + '/resources';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Resource monitoring connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'resource-update' && message.data && this.onUpdate) {
            this.onUpdate(message.data);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = () => {
        console.error('WebSocket error');
        if (this.onError) {
          this.onError('Connection error');
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (this.onError) {
        this.onError('Failed to connect');
      }
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      if (this.onError) {
        this.onError('Failed to reconnect');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);

    setTimeout(() => {
      if (this.onUpdate) {
        this.connect(this.onUpdate, this.onError || undefined);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    console.log('Resource monitoring disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
