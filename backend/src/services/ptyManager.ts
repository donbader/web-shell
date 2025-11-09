import * as pty from 'node-pty';
import { existsSync } from 'fs';
import { TerminalSession } from '../types/index.js';
import config from '../config/config.js';

class PTYManager {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(
    userId: string,
    sessionId: string,
    cols: number = 80,
    rows: number = 24,
    shell?: string,
    environment?: string
  ): TerminalSession {
    // Determine shell to use
    let shellPath: string;

    if (shell) {
      // User requested specific shell
      const shellMap: Record<string, string> = {
        'zsh': '/bin/zsh',
        'bash': '/bin/bash',
        'sh': '/bin/sh',
      };
      shellPath = shellMap[shell.toLowerCase()] || shell;

      // Validate shell exists
      if (!existsSync(shellPath)) {
        console.warn(`[PTYManager] Requested shell ${shellPath} not found, using default`);
        shellPath = this.getDefaultShell();
      }
    } else {
      shellPath = this.getDefaultShell();
    }

    // Spawn PTY process with selected shell
    const ptyProcess = pty.spawn(shellPath, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd: process.env.HOME || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        ENVIRONMENT: environment || 'default', // Used in shell prompt
      } as any,
    });

    const session: TerminalSession = {
      sessionId,
      userId,
      ptyProcess,
      cols,
      rows,
      shell: shellPath,
      environment: environment || 'default',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + (config.idleTimeoutMinutes * 60 * 1000),
    };

    this.sessions.set(sessionId, session);
    console.log(`[PTYManager] Created session ${sessionId} for user ${userId} (shell: ${shellPath}, env: ${environment || 'default'})`);

    return session;
  }

  private getDefaultShell(): string {
    // Use SHELL environment variable if set
    let defaultShell = process.env.SHELL;

    if (!defaultShell) {
      if (process.platform === 'win32') {
        defaultShell = 'powershell.exe';
      } else {
        // Try to find the best available shell (prefer zsh)
        if (existsSync('/bin/zsh')) {
          defaultShell = '/bin/zsh';
        } else if (existsSync('/bin/bash')) {
          defaultShell = '/bin/bash';
        } else {
          defaultShell = '/bin/sh';
        }
      }
    }

    return defaultShell;
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ptyProcess.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      this.updateActivity(sessionId);
      return true;
    }
    return false;
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ptyProcess.write(data);
      this.updateActivity(sessionId);
      return true;
    }
    return false;
  }

  terminateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.ptyProcess.kill();
      this.sessions.delete(sessionId);
      console.log(`[PTYManager] Terminated session ${sessionId}`);
      return true;
    }
    return false;
  }

  getUserSessions(userId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  cleanupIdleSessions(): void {
    const now = Date.now();
    const timeout = config.idleTimeoutMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        console.log(`[PTYManager] Cleaning up idle session ${sessionId}`);
        this.terminateSession(sessionId);
      }
    }
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }
}

export default new PTYManager();
