import { Router, Request, Response } from 'express';
import containerManager from '../services/containerManager.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/images
 * List available terminal images
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const images = await containerManager.listImages();
    res.json({ images });
  } catch (error) {
    logger.error('Error listing images', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to list images',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/images/check/:environment
 * Check if a specific environment image exists
 */
router.get('/check/:environment', async (req: Request, res: Response) => {
  try {
    const { environment } = req.params;

    if (!['minimal', 'default'].includes(environment)) {
      return res.status(400).json({
        error: 'Invalid environment',
        message: 'Environment must be "minimal" or "default"',
      });
    }

    const imageName = `web-shell-backend:${environment}`;
    const exists = await containerManager.imageExists(imageName);

    res.json({ environment, exists });
  } catch (error) {
    logger.error('Error checking image', {
      environment: req.params.environment,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to check image',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/images/build/:environment
 * Build a terminal environment image with Server-Sent Events for progress
 */
router.post('/build/:environment', async (req: Request, res: Response) => {
  try {
    const { environment } = req.params;

    if (!['minimal', 'default'].includes(environment)) {
      return res.status(400).json({
        error: 'Invalid environment',
        message: 'Environment must be "minimal" or "default"',
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial status
    res.write(`data: ${JSON.stringify({ status: 'starting', environment })}\n\n`);

    // Build the image with progress streaming
    await containerManager.buildImage(environment, (progressData) => {
      // Send progress events to client
      const event = {
        status: 'building',
        ...progressData,
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Send completion status
    res.write(`data: ${JSON.stringify({ status: 'completed', environment })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('Error building image', {
      environment: req.params.environment,
      error: error instanceof Error ? error.message : String(error),
    });

    // Send error event
    const errorEvent = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    res.end();
  }
});

export default router;
