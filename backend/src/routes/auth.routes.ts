import { Router, Request, Response } from 'express';
import {
  authenticateUser,
  verifyToken,
  logoutUser,
} from '../services/authService.js';
import { LoginCredentials } from '../types/index.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginCredentials;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Set httpOnly cookie for security
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.expiresAt - Date.now(),
    });

    res.json({
      success: true,
      user: result.user,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
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
