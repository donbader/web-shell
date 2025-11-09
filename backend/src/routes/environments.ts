import { Router, Request, Response } from 'express';
import { getAllEnvironments, getEnvironmentMetadata, compareEnvironments } from '../config/environments';

const router = Router();

/**
 * GET /api/environments
 * Returns metadata for all available environments
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const environments = getAllEnvironments();
    res.json({
      success: true,
      environments,
    });
  } catch (error) {
    console.error('[API] Error fetching environments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environment metadata',
    });
  }
});

/**
 * GET /api/environments/:name
 * Returns metadata for a specific environment
 */
router.get('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const environment = getEnvironmentMetadata(name);

    if (!environment) {
      return res.status(404).json({
        success: false,
        error: `Environment '${name}' not found`,
      });
    }

    res.json({
      success: true,
      environment,
    });
  } catch (error) {
    console.error('[API] Error fetching environment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environment metadata',
    });
  }
});

/**
 * GET /api/environments/compare/:env1/:env2
 * Compares two environments
 */
router.get('/compare/:env1/:env2', (req: Request, res: Response) => {
  try {
    const { env1, env2 } = req.params;
    const comparison = compareEnvironments(env1, env2);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        error: 'One or both environments not found',
      });
    }

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error('[API] Error comparing environments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare environments',
    });
  }
});

export default router;
