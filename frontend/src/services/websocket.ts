export interface WebSocketMessage {
  type: 'input' | 'resize' | 'ping';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface WebSocketResponse {
  type: 'output' | 'session-created' | 'error' | 'pong';
  sessionId?: string;
  data?: string;
  error?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private onDataCallback: ((data: string) => void) | null = null;
  private onSessionCreatedCallback: ((sessionId: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor(private url: string) {}

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          try {
            const response: WebSocketResponse = JSON.parse(event.data);

            switch (response.type) {
              case 'session-created':
                if (response.sessionId) {
                  this.sessionId = response.sessionId;
                  console.log('[WebSocket] Session created:', this.sessionId);
                  if (this.onSessionCreatedCallback) {
                    this.onSessionCreatedCallback(this.sessionId);
                  }
                  resolve(this.sessionId);
                }
                break;

              case 'output':
                if (response.data && this.onDataCallback) {
                  this.onDataCallback(response.data);
                }
                break;

              case 'error':
                console.error('[WebSocket] Error:', response.error);
                if (this.onErrorCallback && response.error) {
                  this.onErrorCallback(response.error);
                }
                break;

              case 'pong':
                // Heartbeat response
                break;
            }
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Connection closed');
          if (this.onCloseCallback) {
            this.onCloseCallback();
          }
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('[WebSocket] Max reconnect attempts reached');
      if (this.onErrorCallback) {
        this.onErrorCallback('Connection lost. Please refresh the page.');
      }
    }
  }

  sendInput(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'input',
        sessionId: this.sessionId || undefined,
        data,
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'resize',
        sessionId: this.sessionId || undefined,
        cols,
        rows,
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type: 'ping' };
      this.ws.send(JSON.stringify(message));
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
    }
  }

  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }

  onSessionCreated(callback: (sessionId: string) => void): void {
    this.onSessionCreatedCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
