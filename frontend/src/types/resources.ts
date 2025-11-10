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
 * Terminal session with metadata
 */
export interface SessionWithMetadata {
  sessionId: string;
  userId: string;
  environment: string;
  shell: string;
  containerName: string;
  containerId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  clientIp: string | null;
  connected: boolean;
  connectedAt: number | null;
}

/**
 * Sessions list response
 */
export interface SessionsResponse {
  sessions: SessionWithMetadata[];
  total: number;
  connected: number;
}

/**
 * Terminate session response
 */
export interface TerminateSessionResponse {
  success: boolean;
  message: string;
  sessionId: string;
  metadata: {
    sessionId: string;
    userId: string;
    clientIp: string;
    environment: string;
    containerName: string;
  };
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
