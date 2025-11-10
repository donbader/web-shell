import { Router, Request, Response } from 'express';
import resourceMonitor from '../services/resourceMonitor.js';
import ptyManager from '../services/ptyManager.js';
import containerManager from '../services/containerManager.js';
import wsConnectionManager from '../services/wsConnectionManager.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/resources/stats
 * Get current system resource statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await resourceMonitor.getSystemStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get resource stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to retrieve resource statistics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/resources/summary
 * Get resource summary as formatted text (for logging/debugging)
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await resourceMonitor.getSummaryText();
    res.type('text/plain').send(summary);
  } catch (error) {
    logger.error('Failed to get resource summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to retrieve resource summary',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/resources/historical
 * Get historical resource statistics (placeholder for future)
 */
router.get('/historical', async (req: Request, res: Response): Promise<void> => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const stats = await resourceMonitor.getHistoricalStats(minutes);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get historical stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to retrieve historical statistics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/resources/sessions
 * Get all active terminal sessions with metadata
 */
router.get('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = ptyManager.getAllSessions();
    const connections = wsConnectionManager.getAllConnections();

    // Build connection map for fast lookup
    const connectionMap = new Map(
      connections.map((conn) => [conn.sessionId, conn])
    );

    // Enhance session data with connection metadata
    const sessionsWithMetadata = sessions.map((session) => {
      const connection = connectionMap.get(session.sessionId);
      return {
        sessionId: session.sessionId,
        userId: session.userId,
        environment: session.environment,
        shell: session.shell,
        containerName: session.containerName,
        containerId: session.containerId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        // Connection metadata
        clientIp: connection?.clientIp || null,
        connected: connection !== undefined,
        connectedAt: connection?.connectedAt || null,
      };
    });

    res.json({
      sessions: sessionsWithMetadata,
      total: sessions.length,
      connected: connections.length,
    });
  } catch (error) {
    logger.error('Failed to get sessions', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to retrieve sessions',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/resources/sessions/:sessionId
 * Terminate a specific terminal session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  // Validate sessionId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    res.status(400).json({
      error: 'Invalid session ID format',
      message: 'Session ID must be a valid UUID',
    });
    return;
  }

  try {
    // Check if session exists
    const session = ptyManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`,
      });
      return;
    }

    // Get connection metadata before termination
    const connection = wsConnectionManager.getConnection(sessionId);
    const metadata = {
      sessionId,
      userId: session.userId,
      clientIp: connection?.clientIp || 'unknown',
      environment: session.environment,
      containerName: session.containerName,
    };

    logger.info(`Terminating session ${sessionId} via API request`, metadata);

    // Send termination notification to client if connected
    if (connection) {
      wsConnectionManager.notifyTermination(
        sessionId,
        'Session terminated by administrator'
      );

      // Give client brief time to receive notification
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Close WebSocket connection
      wsConnectionManager.closeConnection(
        sessionId,
        1000,
        'Session terminated by administrator'
      );
    }

    // Terminate the PTY session and container
    const terminated = await ptyManager.terminateSession(sessionId);

    if (!terminated) {
      logger.warn(`Failed to terminate session ${sessionId}, but continuing cleanup`);
    }

    res.json({
      success: true,
      message: 'Session terminated successfully',
      sessionId,
      metadata,
    });
  } catch (error) {
    logger.error(`Failed to terminate session ${sessionId}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: 'Failed to terminate session',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/resources/orphaned/:containerId
 * Terminate an orphaned container by container ID
 * 
 * This is used when a container exists but is not tracked in the session manager
 * (e.g., after a server restart/crash)
 */
router.delete('/orphaned/:containerId', async (req: Request, res: Response): Promise<void> => {
  const { containerId } = req.params;

  // Validate containerId format (Docker container ID is typically 64 hex characters, but can use short form)
  if (!containerId || containerId.length < 12) {
    res.status(400).json({
      error: 'Invalid container ID format',
      message: 'Container ID must be at least 12 characters',
    });
    return;
  }

  try {
    logger.info(`Terminating orphaned container ${containerId} via API request`);

    // Terminate the orphaned container
    const terminated = await containerManager.terminateOrphanedContainer(containerId);

    if (!terminated) {
      res.status(500).json({
        error: 'Failed to terminate container',
        message: 'Container may not exist or already stopped',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Orphaned container terminated successfully',
      containerId,
    });
  } catch (error) {
    logger.error(`Failed to terminate orphaned container ${containerId}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: 'Failed to terminate orphaned container',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
