import { Router, Request, Response } from 'express';
import {
  authenticateUser,
  verifyToken,
  logoutUser,
} from '../services/authService.js';
import { LoginCredentials } from '../types/index.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with password only (username not required)
 * Rate limited to prevent brute-force attacks
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const result = await authenticateUser(password);

    if (!result) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Set httpOnly cookie for security
    // Enable secure flag in production (HTTPS) to prevent cookie theft
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: config.useHttps, // Enforce HTTPS in production
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: result.expiresAt - Date.now(),
    });

    res.json({
      success: true,
      token: result.token, // Include token in response for localStorage
      user: result.user,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const user = verifyToken(token);
    if (user) {
      logoutUser(user.userId);
    }
  }

  res.clearCookie('auth_token');
  res.json({ success: true });
});

/**
 * GET /api/auth/verify
 * Verify current session
 */
router.get('/verify', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  res.json({
    success: true,
    user,
  });
});

export default router;
