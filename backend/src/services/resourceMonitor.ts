import Docker from 'dockerode';
import logger from '../utils/logger.js';
import containerManager from './containerManager.js';

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

class ResourceMonitor {
  private docker: Docker;
  private previousStats: Map<string, any> = new Map();

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
  }

  /**
   * Get resource stats for a specific container
   */
  private async getContainerStats(containerId: string, containerName: string): Promise<ContainerStats | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

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
      logger.debug(`Failed to get stats for container ${containerName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get comprehensive system stats including all containers
   */
  async getSystemStats(): Promise<SystemStats> {
    const timestamp = Date.now();
    const sessions = containerManager.getAllSessions();

    // Get stats for all session containers
    const sessionStatsPromises = sessions.map(session =>
      this.getContainerStats(session.containerId, session.containerName)
    );
    const sessionStatsResults = await Promise.all(sessionStatsPromises);
    const sessionStats = sessionStatsResults.filter((s): s is ContainerStats => s !== null);

    // Get backend stats
    let backendStats = {
      cpuPercent: 0,
      memoryUsage: 0,
      memoryLimit: 512 * 1024 * 1024,
      memoryPercent: 0,
    };

    try {
      const backendContainer = this.docker.getContainer('web-shell-backend');
      const stats = await this.getContainerStats('web-shell-backend', 'web-shell-backend');
      if (stats) {
        backendStats = {
          cpuPercent: stats.cpuPercent,
          memoryUsage: stats.memoryUsage,
          memoryLimit: stats.memoryLimit,
          memoryPercent: stats.memoryPercent,
        };
      }
    } catch (error) {
      logger.debug('Could not get backend stats (not running in container or name mismatch)');
    }

    // Get frontend stats
    let frontendStats = {
      cpuPercent: 0,
      memoryUsage: 0,
      memoryLimit: 128 * 1024 * 1024,
      memoryPercent: 0,
    };

    try {
      const frontendContainer = this.docker.getContainer('web-shell-frontend');
      const stats = await this.getContainerStats('web-shell-frontend', 'web-shell-frontend');
      if (stats) {
        frontendStats = {
          cpuPercent: stats.cpuPercent,
          memoryUsage: stats.memoryUsage,
          memoryLimit: stats.memoryLimit,
          memoryPercent: stats.memoryPercent,
        };
      }
    } catch (error) {
      logger.debug('Could not get frontend stats (not running in container or name mismatch)');
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
        totalSessions: sessions.length,
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
    ];

    if (stats.sessions.length > 0) {
      lines.push('\nSession Details:');
      stats.sessions.forEach(s => {
        lines.push(`  ${s.containerName}: ${s.memoryPercent.toFixed(1)}% RAM (${ResourceMonitor.formatBytes(s.memoryUsage)}), ${s.cpuPercent.toFixed(1)}% CPU, ${s.pids} PIDs`);
      });
    }

    return lines.join('\n');
  }
}

export default new ResourceMonitor();
