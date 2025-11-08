import * as pty from 'node-pty';
import { existsSync } from 'fs';
import { TerminalSession } from '../types/index.js';
import config from '../config/config.js';

class PTYManager {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(userId: string, sessionId: string, cols: number = 80, rows: number = 24): TerminalSession {
    // Determine shell to use (prefer zsh, fallback to sh for Alpine, bash for others)
    let defaultShell = process.env.SHELL;

    if (!defaultShell) {
      if (process.platform === 'win32') {
        defaultShell = 'powershell.exe';
      } else {
        // Try to find the best available shell
        if (existsSync('/bin/zsh')) {
          defaultShell = '/bin/zsh';
        } else if (existsSync('/bin/bash')) {
          defaultShell = '/bin/bash';
        } else {
          defaultShell = '/bin/sh';
        }
      }
    }

    // Spawn PTY process with user's default shell
    const ptyProcess = pty.spawn(defaultShell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd: process.env.HOME || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      } as any,
    });

    const session: TerminalSession = {
      sessionId,
      userId,
      ptyProcess,
      cols,
      rows,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);
    console.log(`[PTYManager] Created session ${sessionId} for user ${userId}`);

    return session;
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
