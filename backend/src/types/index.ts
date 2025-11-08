export interface User {
  userId: string;
  email: string;
  name?: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
}

export interface TerminalSession extends Session {
  ptyProcess: any; // node-pty IPty type
  cols: number;
  rows: number;
}

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
