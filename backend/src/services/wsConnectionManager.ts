import { WebSocket } from 'ws';
import logger from '../utils/logger.js';

/**
 * WebSocket connection metadata
 */
export interface WSConnectionMetadata {
  sessionId: string;
  userId: string;
  clientIp: string;
  connectedAt: number;
  ws: WebSocket;
}

/**
 * Manages WebSocket connections for terminal sessions
 * Provides connection registry, metadata tracking, and termination capabilities
 */
class WSConnectionManager {
  private connections: Map<string, WSConnectionMetadata> = new Map();

  /**
   * Register a WebSocket connection for a session
   * @param sessionId - Unique session identifier
   * @param userId - User who owns the session
   * @param clientIp - Client IP address
   * @param ws - WebSocket instance
   */
  register(sessionId: string, userId: string, clientIp: string, ws: WebSocket): void {
    if (this.connections.has(sessionId)) {
      logger.warn(`WebSocket connection already registered for session ${sessionId}`);
      return;
    }

    const metadata: WSConnectionMetadata = {
      sessionId,
      userId,
      clientIp,
      connectedAt: Date.now(),
      ws,
    };

    this.connections.set(sessionId, metadata);

    logger.debug(`Registered WebSocket connection for session ${sessionId}`, {
      userId,
      clientIp,
    });
  }

  /**
   * Unregister a WebSocket connection
   * @param sessionId - Session identifier to unregister
   */
  unregister(sessionId: string): void {
    if (this.connections.delete(sessionId)) {
      logger.debug(`Unregistered WebSocket connection for session ${sessionId}`);
    }
  }

  /**
   * Get WebSocket connection metadata for a session
   * @param sessionId - Session identifier
   * @returns Connection metadata or undefined if not found
   */
  getConnection(sessionId: string): WSConnectionMetadata | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Get all active WebSocket connections
   * @returns Array of all connection metadata
   */
  getAllConnections(): WSConnectionMetadata[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections for a specific user
   * @param userId - User identifier
   * @returns Array of user's connections
   */
  getUserConnections(userId: string): WSConnectionMetadata[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId
    );
  }

  /**
   * Check if a session has an active WebSocket connection
   * @param sessionId - Session identifier
   * @returns True if connection exists and is open
   */
  isConnected(sessionId: string): boolean {
    const connection = this.connections.get(sessionId);
    return connection !== undefined && connection.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send a message to a specific session
   * @param sessionId - Target session identifier
   * @param message - Message to send (will be JSON stringified)
   * @returns True if message was sent successfully
   */
  sendMessage(sessionId: string, message: any): boolean {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      logger.warn(`Cannot send message: no connection for session ${sessionId}`);
      return false;
    }

    if (connection.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send message: WebSocket not open for session ${sessionId}`);
      return false;
    }

    try {
      connection.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Failed to send message to session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Notify a session before termination (graceful shutdown)
   * @param sessionId - Session to notify
   * @param reason - Termination reason
   * @returns True if notification was sent
   */
  notifyTermination(sessionId: string, reason: string): boolean {
    return this.sendMessage(sessionId, {
      type: 'termination-notice',
      sessionId,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Close a WebSocket connection
   * @param sessionId - Session identifier
   * @param code - WebSocket close code (default: 1000 normal closure)
   * @param reason - Close reason message
   */
  closeConnection(sessionId: string, code: number = 1000, reason?: string): void {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      logger.debug(`No connection to close for session ${sessionId}`);
      return;
    }

    try {
      if (connection.ws.readyState === WebSocket.OPEN ||
          connection.ws.readyState === WebSocket.CONNECTING) {
        connection.ws.close(code, reason);
        logger.debug(`Closed WebSocket connection for session ${sessionId}`, {
          code,
          reason,
        });
      }
    } catch (error) {
      logger.error(`Error closing WebSocket for session ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.unregister(sessionId);
    }
  }

  /**
   * Get connection count statistics
   * @returns Connection statistics
   */
  getStats(): { total: number; byUser: Record<string, number> } {
    const byUser: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      byUser[connection.userId] = (byUser[connection.userId] || 0) + 1;
    }

    return {
      total: this.connections.size,
      byUser,
    };
  }
}

export default new WSConnectionManager();
