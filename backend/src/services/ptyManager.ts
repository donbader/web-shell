import Docker from 'dockerode';
import { TerminalSession } from '../types/index.js';
import config from '../config/config.js';
import containerManager from './containerManager.js';
import logger from '../utils/logger.js';

class PTYManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async createSession(
    userId: string,
    sessionId: string,
    cols: number = 80,
    rows: number = 24,
    shell?: string,
    environment?: string
  ): Promise<TerminalSession> {
    const env = environment || 'default';

    try {
      // Create Docker container for this session
      const containerSession = await containerManager.createContainer(
        userId,
        sessionId,
        env
      );

      // Get the container instance
      const container = this.docker.getContainer(containerSession.containerId);

      // Attach to container with TTY
      const execOptions = {
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: [shell || '/bin/zsh'],
        Env: [`TERM=xterm-256color`],
      };

      const exec = await container.exec(execOptions);
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
      });

      // Resize TTY to match client dimensions
      try {
        await exec.resize({ h: rows, w: cols });
      } catch (resizeError) {
        logger.warn('Failed to resize TTY', {
          error: resizeError instanceof Error ? resizeError.message : String(resizeError),
        });
      }

      const session: TerminalSession = {
        sessionId,
        userId,
        ptyProcess: stream as any, // Stream acts like pty process
        cols,
        rows,
        shell: shell || '/bin/zsh',
        environment: env,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + config.idleTimeoutMinutes * 60 * 1000,
        // Additional Docker-specific fields
        containerId: containerSession.containerId,
        containerName: containerSession.containerName,
        volumeName: containerSession.volumeName,
      };

      this.sessions.set(sessionId, session);

      logger.info(`Created PTY session ${sessionId} for user ${userId}`, {
        containerName: containerSession.containerName,
        environment: env,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create PTY session', {
        userId,
        sessionId,
        environment: env,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to create terminal session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      containerManager.updateActivity(sessionId);
    }
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      const container = this.docker.getContainer(session.containerId!);

      // Get running exec instances
      const containerInfo = await container.inspect();
      const execId = containerInfo.ExecIDs?.[0];

      if (execId) {
        const exec = this.docker.getExec(execId);
        await exec.resize({ h: rows, w: cols });
      }

      session.cols = cols;
      session.rows = rows;
      this.updateActivity(sessionId);

      return true;
    } catch (error) {
      logger.error(`Failed to resize session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) {
      return false;
    }

    try {
      session.ptyProcess.write(data);
      this.updateActivity(sessionId);
      return true;
    } catch (error) {
      logger.error(`Failed to write to session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      // Close the stream
      if (session.ptyProcess) {
        session.ptyProcess.end();
      }

      // Terminate the container
      await containerManager.terminateContainer(sessionId);

      this.sessions.delete(sessionId);

      logger.info(`Terminated PTY session ${sessionId}`);

      return true;
    } catch (error) {
      logger.error(`Failed to terminate session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.sessions.delete(sessionId);
      return false;
    }
  }

  getUserSessions(userId: string): TerminalSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const timeout = config.idleTimeoutMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        logger.info(`Cleaning up idle PTY session ${sessionId}`, {
          idleMinutes: Math.floor((now - session.lastActivity) / 60000),
        });
        await this.terminateSession(sessionId);
      }
    }

    // Also cleanup idle containers
    await containerManager.cleanupIdleContainers();
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check if Docker is available
   */
  async checkDockerConnection(): Promise<boolean> {
    return await containerManager.checkConnection();
  }

  /**
   * List available environment images
   */
  async listAvailableEnvironments(): Promise<string[]> {
    return await containerManager.listImages();
  }
}

export default new PTYManager();
