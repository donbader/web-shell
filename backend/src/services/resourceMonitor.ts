import Docker from 'dockerode';
import logger from '../utils/logger.js';
import containerManager from './containerManager.js';
import { Readable } from 'stream';

/**
 * Resource usage statistics for a container
 */
export interface ContainerStats {
  containerId: string;
  containerName: string;
  cpuPercent: number;
  memoryUsage: number; // bytes
  memoryLimit: number; // bytes
  memoryPercent: number;
  networkRx: number; // bytes received
  networkTx: number; // bytes transmitted
  blockRead: number; // bytes
  blockWrite: number; // bytes
  pids: number;
  orphaned?: boolean; // true if container is not tracked in session manager
}

/**
 * System-level resource statistics
 */
export interface SystemStats {
  timestamp: number;
  backend: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
  };
  frontend: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
  };
  sessions: ContainerStats[];
  summary: {
    totalSessions: number;
    totalMemoryUsage: number;
    totalCpuPercent: number;
    activeSessions: number;
    idleSessions: number;
  };
}

/**
 * Container stats stream handler
 */
interface StatsStreamHandler {
  containerId: string;
  containerName: string;
  stream: Readable;
  latestStats: any;
  isActive: boolean;
}

class ResourceMonitor {
  private docker: Docker;
  private statsStreams: Map<string, StatsStreamHandler> = new Map();
  private streamCheckInterval: NodeJS.Timeout | null = null;
  private cachedContainers: { tracked: any[]; orphaned: any[] } | null = null;
  private lastContainerDiscovery: number = 0;
  private containerDiscoveryCacheTTL: number = 5000; // Cache for 5 seconds

  constructor() {
    // Reuse Docker connection from containerManager
    const dockerHost = process.env.DOCKER_HOST || '/var/run/docker.sock';

    if (dockerHost.startsWith('tcp://')) {
      const url = new URL(dockerHost);
      this.docker = new Docker({
        host: url.hostname,
        port: parseInt(url.port || '2375', 10),
      });
    } else {
      this.docker = new Docker({ socketPath: dockerHost });
    }

    // Start periodic stream health check
    this.startStreamHealthCheck();
  }

  /**
   * Get containers with caching to reduce Docker API calls
   */
  private async getCachedContainers(): Promise<{ tracked: any[]; orphaned: any[] }> {
    const now = Date.now();

    // Return cached result if still valid
    if (this.cachedContainers && (now - this.lastContainerDiscovery) < this.containerDiscoveryCacheTTL) {
      return this.cachedContainers;
    }

    // Fetch fresh container list
    const containers = await containerManager.discoverAllSessionContainers();
    this.cachedContainers = containers;
    this.lastContainerDiscovery = now;

    return containers;
  }

  /**
   * Start a stats stream for a container
   */
  private async startStatsStream(containerId: string, containerName: string): Promise<void> {
    // Check if stream already exists
    if (this.statsStreams.has(containerId)) {
      return;
    }

    try {
      const container = this.docker.getContainer(containerId);

      // Use stream=true for persistent connection
      const stream = await container.stats({ stream: true }) as Readable;

      const handler: StatsStreamHandler = {
        containerId,
        containerName,
        stream,
        latestStats: null,
        isActive: true,
      };

      // Listen for stats data
      stream.on('data', (chunk: Buffer) => {
        try {
          const stats = JSON.parse(chunk.toString());
          handler.latestStats = stats;
          handler.isActive = true;
        } catch (error) {
          logger.debug(`Failed to parse stats for ${containerName}`, { error });
        }
      });

      stream.on('error', (error) => {
        logger.debug(`Stats stream error for ${containerName}`, { error });
        this.stopStatsStream(containerId);
      });

      stream.on('end', () => {
        logger.debug(`Stats stream ended for ${containerName}`);
        this.stopStatsStream(containerId);
      });

      this.statsStreams.set(containerId, handler);
      logger.debug(`Started stats stream for ${containerName}`);
    } catch (error) {
      logger.debug(`Failed to start stats stream for ${containerName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stop a stats stream for a container
   */
  private stopStatsStream(containerId: string): void {
    const handler = this.statsStreams.get(containerId);
    if (handler) {
      try {
        handler.stream.destroy();
      } catch (error) {
        // Ignore errors when destroying stream
      }
      this.statsStreams.delete(containerId);
      logger.debug(`Stopped stats stream for ${handler.containerName}`);
    }
  }

  /**
   * Get stats from a running stream
   */
  private getStatsFromStream(containerId: string, containerName: string): ContainerStats | null {
    const handler = this.statsStreams.get(containerId);

    if (!handler || !handler.latestStats) {
      return null;
    }

    const stats = handler.latestStats;

    try {
      // Calculate CPU percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                       (stats.precpu_stats.cpu_usage?.total_usage || 0);
      const systemDelta = stats.cpu_stats.system_cpu_usage -
                          (stats.precpu_stats.system_cpu_usage || 0);
      const cpuPercent = systemDelta > 0 && cpuDelta > 0
        ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
        : 0;

      // Memory stats
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // Network stats
      let networkRx = 0;
      let networkTx = 0;
      if (stats.networks) {
        Object.values(stats.networks).forEach((net: any) => {
          networkRx += net.rx_bytes || 0;
          networkTx += net.tx_bytes || 0;
        });
      }

      // Block I/O stats
      let blockRead = 0;
      let blockWrite = 0;
      if (stats.blkio_stats?.io_service_bytes_recursive) {
        stats.blkio_stats.io_service_bytes_recursive.forEach((item: any) => {
          if (item.op === 'Read') blockRead += item.value;
          if (item.op === 'Write') blockWrite += item.value;
        });
      }

      // PIDs
      const pids = stats.pids_stats?.current || 0;

      return {
        containerId,
        containerName,
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage,
        memoryLimit,
        memoryPercent: Math.round(memoryPercent * 100) / 100,
        networkRx,
        networkTx,
        blockRead,
        blockWrite,
        pids,
      };
    } catch (error) {
      logger.debug(`Failed to process stats for ${containerName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Periodic health check to manage streams
   */
  private startStreamHealthCheck(): void {
    if (this.streamCheckInterval) {
      return;
    }

    this.streamCheckInterval = setInterval(async () => {
      try {
        // Get current containers (this will refresh the cache)
        const { tracked, orphaned } = await containerManager.discoverAllSessionContainers();
        this.cachedContainers = { tracked, orphaned };
        this.lastContainerDiscovery = Date.now();

        const currentContainerIds = new Set([
          ...tracked.map(t => t.containerId),
          ...orphaned.map(o => o.containerId),
          'web-shell-backend',
          'web-shell-frontend',
        ]);

        // Stop streams for containers that no longer exist
        for (const [containerId, handler] of this.statsStreams.entries()) {
          if (!currentContainerIds.has(containerId)) {
            logger.debug(`Container ${handler.containerName} no longer exists, stopping stream`);
            this.stopStatsStream(containerId);
          }
        }

        // Start streams for new containers
        for (const session of tracked) {
          if (!this.statsStreams.has(session.containerId)) {
            await this.startStatsStream(session.containerId, session.containerName);
          }
        }

        for (const orphan of orphaned) {
          if (!this.statsStreams.has(orphan.containerId)) {
            await this.startStatsStream(orphan.containerId, orphan.containerName);
          }
        }

        // Ensure backend/frontend streams exist
        if (!this.statsStreams.has('web-shell-backend')) {
          await this.startStatsStream('web-shell-backend', 'web-shell-backend');
        }
        if (!this.statsStreams.has('web-shell-frontend')) {
          await this.startStatsStream('web-shell-frontend', 'web-shell-frontend');
        }
      } catch (error) {
        logger.debug('Stream health check failed', { error });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get comprehensive system stats using streaming data
   */
  async getSystemStats(): Promise<SystemStats> {
    const timestamp = Date.now();

    // Use cached container discovery (reduces Docker API calls)
    const { tracked, orphaned } = await this.getCachedContainers();

    // Ensure streams exist for all containers
    const allContainers = [
      ...tracked.map(t => ({ id: t.containerId, name: t.containerName, orphaned: false })),
      ...orphaned.map(o => ({ id: o.containerId, name: o.containerName, orphaned: true })),
    ];

    // Start missing streams (non-blocking)
    for (const container of allContainers) {
      if (!this.statsStreams.has(container.id)) {
        this.startStatsStream(container.id, container.name).catch(() => {
          // Ignore errors, stream will be retried on next health check
        });
      }
    }

    // Get stats from streams
    const sessionStats: ContainerStats[] = [];
    for (const container of allContainers) {
      const stats = this.getStatsFromStream(container.id, container.name);
      if (stats) {
        if (container.orphaned) {
          (stats as any).orphaned = true;
        }
        sessionStats.push(stats);
      }
    }

    // Get backend stats
    let backendStats = {
      cpuPercent: 0,
      memoryUsage: 0,
      memoryLimit: 512 * 1024 * 1024,
      memoryPercent: 0,
    };

    const backendStatsData = this.getStatsFromStream('web-shell-backend', 'web-shell-backend');
    if (backendStatsData) {
      backendStats = {
        cpuPercent: backendStatsData.cpuPercent,
        memoryUsage: backendStatsData.memoryUsage,
        memoryLimit: backendStatsData.memoryLimit,
        memoryPercent: backendStatsData.memoryPercent,
      };
    }

    // Get frontend stats
    let frontendStats = {
      cpuPercent: 0,
      memoryUsage: 0,
      memoryLimit: 128 * 1024 * 1024,
      memoryPercent: 0,
    };

    const frontendStatsData = this.getStatsFromStream('web-shell-frontend', 'web-shell-frontend');
    if (frontendStatsData) {
      frontendStats = {
        cpuPercent: frontendStatsData.cpuPercent,
        memoryUsage: frontendStatsData.memoryUsage,
        memoryLimit: frontendStatsData.memoryLimit,
        memoryPercent: frontendStatsData.memoryPercent,
      };
    }

    // Calculate summary
    const totalMemoryUsage = sessionStats.reduce((sum, s) => sum + s.memoryUsage, 0);
    const totalCpuPercent = sessionStats.reduce((sum, s) => sum + s.cpuPercent, 0);
    const activeSessions = sessionStats.filter(s => s.cpuPercent > 1).length;
    const idleSessions = sessionStats.filter(s => s.cpuPercent <= 1).length;

    return {
      timestamp,
      backend: backendStats,
      frontend: frontendStats,
      sessions: sessionStats,
      summary: {
        totalSessions: tracked.length + orphaned.length,
        totalMemoryUsage,
        totalCpuPercent: Math.round(totalCpuPercent * 100) / 100,
        activeSessions,
        idleSessions,
      },
    };
  }

  /**
   * Get historical stats for trending (placeholder for future enhancement)
   */
  async getHistoricalStats(minutes: number = 60): Promise<SystemStats[]> {
    // Future: Implement time-series storage
    // For now, return current stats only
    const current = await this.getSystemStats();
    return [current];
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get resource usage summary as text (for logging)
   */
  async getSummaryText(): Promise<string> {
    const stats = await this.getSystemStats();
    const lines = [
      `=== Resource Monitor (${new Date(stats.timestamp).toISOString()}) ===`,
      `Backend: ${stats.backend.memoryPercent.toFixed(1)}% RAM (${ResourceMonitor.formatBytes(stats.backend.memoryUsage)}), ${stats.backend.cpuPercent.toFixed(1)}% CPU`,
      `Frontend: ${stats.frontend.memoryPercent.toFixed(1)}% RAM (${ResourceMonitor.formatBytes(stats.frontend.memoryUsage)}), ${stats.frontend.cpuPercent.toFixed(1)}% CPU`,
      `Sessions: ${stats.summary.totalSessions} total (${stats.summary.activeSessions} active, ${stats.summary.idleSessions} idle)`,
      `Total Session Resources: ${ResourceMonitor.formatBytes(stats.summary.totalMemoryUsage)} RAM, ${stats.summary.totalCpuPercent.toFixed(1)}% CPU`,
      `Active Stats Streams: ${this.statsStreams.size}`,
    ];

    if (stats.sessions.length > 0) {
      lines.push('\nSession Details:');
      stats.sessions.forEach(s => {
        lines.push(`  ${s.containerName}: ${s.memoryPercent.toFixed(1)}% RAM (${ResourceMonitor.formatBytes(s.memoryUsage)}), ${s.cpuPercent.toFixed(1)}% CPU, ${s.pids} PIDs`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Cleanup all streams on shutdown
   */
  shutdown(): void {
    if (this.streamCheckInterval) {
      clearInterval(this.streamCheckInterval);
      this.streamCheckInterval = null;
    }

    for (const [containerId] of this.statsStreams) {
      this.stopStatsStream(containerId);
    }

    logger.info('Resource monitor shutdown complete');
  }
}

export default new ResourceMonitor();
