import { Request, Response, NextFunction } from 'express';
import { User } from '../types/index.js';
import config from '../config/config.js';
import { verifyToken } from '../services/authService.js';

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

  // Production mode: Verify JWT token
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}
