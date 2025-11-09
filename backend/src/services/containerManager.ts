import Docker from 'dockerode';
import config from '../config/config.js';
import logger from '../utils/logger.js';

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
    // Connect to Docker daemon via configured host (socket or TCP proxy)
    const dockerHost = config.dockerHost;

    if (dockerHost.startsWith('tcp://')) {
      // TCP connection through Docker socket proxy
      const url = new URL(dockerHost);
      this.docker = new Docker({
        host: url.hostname,
        port: parseInt(url.port || '2375', 10),
      });
      logger.info(`Connected to Docker via proxy at ${dockerHost}`);
    } else {
      // Direct socket connection (legacy/local development)
      this.docker = new Docker({ socketPath: dockerHost });
      logger.info(`Connected to Docker via socket at ${dockerHost}`);
    }
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

      logger.info(`Created container ${containerName} for user ${userId}`, {
        environment,
        containerId: container.id,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create container', {
        userId,
        environment,
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.debug(`Volume ${volumeName} already exists`);
    } catch (error) {
      // Volume doesn't exist, create it
      try {
        await this.docker.createVolume({
          Name: volumeName,
          Labels: {
            'web-shell.persistent': 'true',
          },
        });
        logger.info(`Created volume ${volumeName}`);
      } catch (createError) {
        logger.error('Failed to create volume', {
          volumeName,
          error: createError instanceof Error ? createError.message : String(createError),
        });
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

      logger.info(`Terminated container ${session.containerName}`, { sessionId });

      return true;
    } catch (error) {
      logger.error(`Failed to terminate container ${session.containerName}`, {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
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
        logger.info(`Cleaning up idle container ${session.containerName}`, {
          sessionId,
          idleMinutes: Math.floor((now - session.lastActivity) / 60000),
        });
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
      logger.error('Docker connection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.error('Failed to list images', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Check if an image exists
   */
  async imageExists(imageName: string): Promise<boolean> {
    try {
      const image = this.docker.getImage(imageName);
      await image.inspect();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build a terminal environment image with progress streaming
   * @param environment - 'minimal' or 'default'
   * @param onProgress - Callback for build progress updates
   */
  async buildImage(
    environment: string,
    onProgress?: (data: { stream?: string; status?: string; progress?: string }) => void
  ): Promise<void> {
    const imageName = `web-shell-backend:${environment}`;

    logger.info(`Building image ${imageName}...`);

    try {
      // Import tar module for creating build context
      const tar = await import('tar');

      // Create tar stream of the backend directory
      const tarStream = tar.c(
        {
          gzip: false,
          cwd: '/app', // Current working directory in dev container
        },
        ['.'] // Include all files from current directory
      );

      // Build the image - cast tar stream to unknown then to NodeJS.ReadableStream
      const stream = await this.docker.buildImage(tarStream as unknown as NodeJS.ReadableStream, {
        t: imageName,
        target: environment,
        buildargs: {
          ENVIRONMENT: environment,
        },
      });

      // Process the stream
      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err, res) => {
            if (err) {
              logger.error(`Build failed for ${imageName}`, {
                error: err instanceof Error ? err.message : String(err),
              });
              reject(err);
            } else {
              logger.info(`Successfully built ${imageName}`);
              resolve();
            }
          },
          (event) => {
            // Forward progress events to callback
            if (onProgress) {
              onProgress(event);
            }

            // Log progress to console
            if (event.stream) {
              process.stdout.write(event.stream);
            } else if (event.status) {
              logger.debug(`Build: ${event.status} ${event.progress || ''}`);
            }
          }
        );
      });
    } catch (error) {
      logger.error(`Failed to build image ${imageName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to build image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure image exists, build if necessary
   */
  async ensureImageExists(
    environment: string,
    onProgress?: (data: { stream?: string; status?: string; progress?: string }) => void
  ): Promise<boolean> {
    const imageName = `web-shell-backend:${environment}`;

    const exists = await this.imageExists(imageName);
    if (exists) {
      logger.debug(`Image ${imageName} already exists`);
      return true;
    }

    logger.info(`Image ${imageName} not found, building...`);
    await this.buildImage(environment, onProgress);
    return true;
  }
}

export default new ContainerManager();
