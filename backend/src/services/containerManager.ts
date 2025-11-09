import Docker from 'dockerode';
import config from '../config/config.js';

interface ContainerSession {
  containerId: string;
  containerName: string;
  userId: string;
  environment: string;
  volumeName: string;
  createdAt: number;
  lastActivity: number;
}

class ContainerManager {
  private docker: Docker;
  private sessions: Map<string, ContainerSession> = new Map();

  constructor() {
    // Connect to Docker daemon via socket
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Create a new container for a terminal session with persistent volume
   */
  async createContainer(
    userId: string,
    sessionId: string,
    environment: string = 'default'
  ): Promise<ContainerSession> {
    // Create or reuse persistent volume for this user
    const volumeName = `web-shell-${userId}-${environment}`;
    await this.ensureVolumeExists(volumeName);

    // Container name for easy identification
    const containerName = `web-shell-session-${sessionId}`;

    // Determine which image to use
    const imageName = `web-shell-backend:${environment}`;

    try {
      // Create container with persistent volume
      const container = await this.docker.createContainer({
        name: containerName,
        Image: imageName,
        Tty: true,
        OpenStdin: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Env: [
          `ENVIRONMENT=${environment}`,
          `USER_ID=${userId}`,
          `SESSION_ID=${sessionId}`,
        ],
        Cmd: ['/bin/zsh'],
        WorkingDir: '/workspace',
        HostConfig: {
          // Mount persistent volume to /workspace
          Binds: [`${volumeName}:/workspace`],
          // Auto-remove container when it stops
          AutoRemove: true,
          // Network mode to communicate with backend
          NetworkMode: 'web-shell_web-shell-network',
        },
        Labels: {
          'web-shell.user': userId,
          'web-shell.session': sessionId,
          'web-shell.environment': environment,
        },
      });

      // Start the container
      await container.start();

      const session: ContainerSession = {
        containerId: container.id,
        containerName,
        userId,
        environment,
        volumeName,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.sessions.set(sessionId, session);

      console.log(
        `[ContainerManager] Created container ${containerName} for user ${userId} (env: ${environment})`
      );

      return session;
    } catch (error) {
      console.error(`[ContainerManager] Failed to create container:`, error);
      throw new Error(`Failed to create container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure a Docker volume exists for persistent storage
   */
  private async ensureVolumeExists(volumeName: string): Promise<void> {
    try {
      const volume = this.docker.getVolume(volumeName);
      await volume.inspect();
      console.log(`[ContainerManager] Volume ${volumeName} already exists`);
    } catch (error) {
      // Volume doesn't exist, create it
      try {
        await this.docker.createVolume({
          Name: volumeName,
          Labels: {
            'web-shell.persistent': 'true',
          },
        });
        console.log(`[ContainerManager] Created volume ${volumeName}`);
      } catch (createError) {
        console.error(`[ContainerManager] Failed to create volume:`, createError);
        throw createError;
      }
    }
  }

  /**
   * Get container instance for a session
   */
  getContainer(sessionId: string): Docker.Container | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    return this.docker.getContainer(session.containerId);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): ContainerSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Stop and remove a container
   */
  async terminateContainer(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      const container = this.docker.getContainer(session.containerId);

      // Stop container (will auto-remove due to AutoRemove flag)
      await container.stop({ t: 5 }); // 5 second timeout

      this.sessions.delete(sessionId);

      console.log(
        `[ContainerManager] Terminated container ${session.containerName}`
      );

      return true;
    } catch (error) {
      console.error(
        `[ContainerManager] Failed to terminate container ${session.containerName}:`,
        error
      );
      // Remove from sessions even if stop failed
      this.sessions.delete(sessionId);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): ContainerSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId
    );
  }

  /**
   * Cleanup idle containers
   */
  async cleanupIdleContainers(): Promise<void> {
    const now = Date.now();
    const timeout = config.idleTimeoutMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        console.log(
          `[ContainerManager] Cleaning up idle container ${session.containerName}`
        );
        await this.terminateContainer(sessionId);
      }
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): ContainerSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check Docker connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('[ContainerManager] Docker connection failed:', error);
      return false;
    }
  }

  /**
   * List available images
   */
  async listImages(): Promise<string[]> {
    try {
      const images = await this.docker.listImages();
      return images
        .filter((img) => img.RepoTags && img.RepoTags.length > 0)
        .flatMap((img) => img.RepoTags!)
        .filter((tag) => tag.startsWith('web-shell-backend:'));
    } catch (error) {
      console.error('[ContainerManager] Failed to list images:', error);
      return [];
    }
  }
}

export default new ContainerManager();
