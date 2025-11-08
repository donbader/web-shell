import { Request, Response, NextFunction } from 'express';
import { User } from '../types/index.js';
import config from '../config/config.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Dev mode: Auto-assign mock user
  if (!config.authEnabled) {
    req.user = {
      userId: 'dev-user',
      email: 'dev@localhost',
      name: 'Development User',
    };
    return next();
  }

  // Production mode: JWT validation will be implemented in Phase 6
  // For now, reject requests in production mode
  res.status(401).json({ error: 'Authentication required' });
}
