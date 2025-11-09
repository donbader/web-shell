import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { User, AuthTokenPayload, Session } from '../types/index.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

// In-memory user store (replace with database in production)
// Passwords are hashed with bcrypt
const users = new Map<string, {
  userId: string;
  username: string;
  email: string;
  name: string;
  passwordHash: string;
}>();

// In-memory session store (replace with Redis in production)
const sessions = new Map<string, Session>();

/**
 * Initialize default user (for development/testing)
 * Default credentials: admin / admin123
 */
export function initializeDefaultUser(): void {
  const defaultUsername = process.env.DEFAULT_USERNAME || 'admin';
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  users.set(defaultUsername, {
    userId: 'user-001',
    username: defaultUsername,
    email: `${defaultUsername}@localhost`,
    name: 'Administrator',
    passwordHash,
  });

  logger.info(`Default user created: ${defaultUsername}`);
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ user: User; token: string; expiresAt: number } | null> {
  const user = users.get(username);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Generate JWT token
  const expiresIn = config.sessionExpiry;
  const expiresAt = Date.now() + parseExpiry(expiresIn);

  const payload = {
    userId: user.userId,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn,
  } as jwt.SignOptions);

  // Create session
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    sessionId,
    userId: user.userId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    expiresAt,
  });

  return {
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
    },
    token,
    expiresAt,
  };
}

/**
 * Verify JWT token and return user info
 */
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return true;
  }
  return Date.now() > session.expiresAt;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired sessions`);
  }
}

/**
 * Logout user (delete session)
 */
export function logoutUser(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Parse expiry string (e.g., "24h", "7d") to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);

  if (!match) {
    return 24 * 60 * 60 * 1000; // Default 24 hours
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId: string): Session[] {
  return Array.from(sessions.values()).filter(s => s.userId === userId);
}
