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
  expiresAt: number;
}

export interface TerminalSession extends Session {
  ptyProcess: any; // node-pty IPty type
  cols: number;
  rows: number;
  shell: string; // Shell path (e.g., /bin/zsh, /bin/bash)
  environment: string; // Environment name (e.g., default, minimal)
}

export interface WebSocketMessage {
  type: 'input' | 'resize' | 'ping' | 'create-session';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  shell?: string; // Requested shell (zsh, bash)
  environment?: string; // Requested environment (default, minimal)
}

export interface WebSocketResponse {
  type: 'output' | 'session-created' | 'error' | 'pong';
  sessionId?: string;
  data?: string;
  error?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}
