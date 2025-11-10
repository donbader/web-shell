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
