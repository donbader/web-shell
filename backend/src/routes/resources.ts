import { Router, Request, Response } from 'express';
import resourceMonitor from '../services/resourceMonitor.js';
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

export default router;
