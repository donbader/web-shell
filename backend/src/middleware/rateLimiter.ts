import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * Rate limiter for login endpoint
 * Prevents brute-force attacks by limiting login attempts
 *
 * Default: 5 attempts per 15 minutes per IP
 * Configurable via environment variables
 */
export const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'), // 5 attempts
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: 'Rate limit exceeded',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Log rate limit violations
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logger.warn('Rate limit exceeded for login attempt', {
      ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },

  // Skip rate limiting in development if explicitly disabled
  skip: (req) => {
    return process.env.NODE_ENV === 'development' &&
           process.env.RATE_LIMIT_ENABLED === 'false';
  },
});

/**
 * General API rate limiter
 * Applies to all API endpoints for basic protection
 *
 * Default: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logger.warn('API rate limit exceeded', {
      ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many requests. Please slow down.',
    });
  },

  skip: (req) => {
    return process.env.NODE_ENV === 'development' &&
           process.env.RATE_LIMIT_ENABLED === 'false';
  },
});
