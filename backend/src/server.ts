import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import config from './config/config.js';
import { validateEnvironment, logConfiguration } from './config/validation.js';
import ptyManager from './services/ptyManager.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import environmentRoutes from './routes/environments.js';
import imageRoutes from './routes/images.js';
import resourceRoutes from './routes/resources.js';
import {
  initializeDefaultUser,
  verifyToken,
  cleanupExpiredSessions,
} from './services/authService.js';
import { WebSocketMessage, WebSocketResponse } from './types/index.js';
import { randomUUID } from 'crypto';
import logger from './utils/logger.js';
import {
  validateWebSocketMessage,
  validateTerminalDimensions,
  validateShell,
  validateEnvironment as validateWsEnvironment,
  validateInputData,
  logValidationFailure,
} from './utils/websocketValidation.js';

// Validate environment configuration at startup
validateEnvironment();

const app = express();

// Create server based on environment and HTTPS configuration
let server: ReturnType<typeof createHttpServer> | ReturnType<typeof createHttpsServer>;
let httpRedirectServer: ReturnType<typeof createHttpServer> | null = null;

if (config.useHttps) {
  try {
    // Load SSL certificates
    const httpsOptions = {
      key: readFileSync(config.sslKeyPath),
      cert: readFileSync(config.sslCertPath),
    };

    server = createHttpsServer(httpsOptions, app);
    logger.info('HTTPS enabled with SSL certificates');

    // Create HTTP to HTTPS redirect server
    if (config.nodeEnv === 'production') {
      httpRedirectServer = createHttpServer((req, res) => {
        const host = req.headers.host?.split(':')[0] || 'localhost';
        const redirectUrl = `https://${host}:${config.port}${req.url}`;
        res.writeHead(301, { Location: redirectUrl });
        res.end();
      });
      logger.info(`HTTP→HTTPS redirect enabled on port ${config.httpPort}`);
    }
  } catch (error) {
    logger.error('CRITICAL ERROR: Failed to load SSL certificates', {
      keyPath: config.sslKeyPath,
      certPath: config.sslCertPath,
      error: error instanceof Error ? error.message : String(error),
    });
    logger.error('Generate self-signed certificates with:');
    logger.error('  mkdir -p backend/certs && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\');
    logger.error('    -keyout backend/certs/key.pem -out backend/certs/cert.pem');
    process.exit(1);
  }
} else {
  server = createHttpServer(app);
  logger.info('HTTP mode (development)');
}

const wss = new WebSocketServer({ server });

// Initialize default user if auth is enabled
if (config.authEnabled) {
  initializeDefaultUser();
}

// Middleware
// Security headers with Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],     // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.useHttps ? [] : null, // Only enforce HTTPS upgrade in production
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS
}));

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Environment metadata routes (public)
app.use('/api/environments', environmentRoutes);

// Image management routes (public for checking, can add auth later if needed)
app.use('/api/images', imageRoutes);

// Resource monitoring routes (public for now, can add auth later)
app.use('/api/resources', resourceRoutes);

// API routes with auth
app.get('/api/sessions', authMiddleware, (req, res) => {
  const sessions = ptyManager.getUserSessions(req.user!.userId);
  res.json({
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      expiresAt: s.expiresAt,
    })),
  });
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req) => {
  let userId: string;
  let sessionId: string;

  // Extract and verify token
  if (!config.authEnabled) {
    // Dev mode: Auto-assign user
    userId = 'dev-user';
    logger.debug('WebSocket connection from dev user');
  } else {
    // Production mode: Verify JWT
    const token = extractTokenFromRequest(req);

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    const user = verifyToken(token);

    if (!user) {
      ws.close(1008, 'Invalid or expired token');
      return;
    }

    userId = user.userId;
    logger.debug(`WebSocket connection from user: ${userId}`);
  }

  // Check session limit
  const userSessions = ptyManager.getUserSessions(userId);
  if (userSessions.length >= config.maxSessionsPerUser) {
    ws.send(JSON.stringify({
      type: 'error',
      error: `Maximum ${config.maxSessionsPerUser} sessions exceeded`,
    } as WebSocketResponse));
    ws.close(1008, 'Session limit exceeded');
    return;
  }

  // Don't create session immediately - wait for create-session message
  let session: any = null;

  // Handle WebSocket messages
  ws.on('message', async (message: Buffer) => {
    try {
      const msg = JSON.parse(message.toString()) as WebSocketMessage;

      // Validate message structure
      const msgValidation = validateWebSocketMessage(msg);
      if (!msgValidation.valid) {
        ws.send(JSON.stringify({
          type: 'error',
          error: msgValidation.error,
        } as WebSocketResponse));
        return;
      }

      switch (msg.type) {
        case 'create-session': {
          // Validate terminal dimensions
          const dimsValidation = validateTerminalDimensions(
            msg.cols || 80,
            msg.rows || 24
          );
          if (!dimsValidation.valid) {
            logValidationFailure('create-session', 'cols/rows', dimsValidation.error!, msg);
            ws.send(JSON.stringify({
              type: 'error',
              error: dimsValidation.error,
            } as WebSocketResponse));
            return;
          }

          // Validate shell
          const shellValidation = validateShell(msg.shell);
          if (!shellValidation.valid) {
            logValidationFailure('create-session', 'shell', shellValidation.error!, msg.shell);
            ws.send(JSON.stringify({
              type: 'error',
              error: shellValidation.error,
            } as WebSocketResponse));
            return;
          }

          // Validate environment
          const envValidation = validateWsEnvironment(msg.environment);
          if (!envValidation.valid) {
            logValidationFailure('create-session', 'environment', envValidation.error!, msg.environment);
            ws.send(JSON.stringify({
              type: 'error',
              error: envValidation.error,
            } as WebSocketResponse));
            return;
          }

          // Create terminal session with validated parameters
          sessionId = randomUUID();
          session = await ptyManager.createSession(
            userId,
            sessionId,
            dimsValidation.cols!,
            dimsValidation.rows!,
            shellValidation.shell!,
            envValidation.environment!
          );

          // Send session created message
          ws.send(JSON.stringify({
            type: 'session-created',
            sessionId,
          } as WebSocketResponse));

          // Forward Docker stream output to WebSocket
          session.ptyProcess.on('data', (data: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'output',
                sessionId,
                data: data.toString('utf-8'),
              } as WebSocketResponse));
            }
          });

          // Handle stream close
          session.ptyProcess.on('end', () => {
            logger.debug(`PTY stream ended for session ${sessionId}`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Terminal session ended',
              } as WebSocketResponse));
            }
            ptyManager.terminateSession(sessionId);
            ws.close();
          });
          break;
        }

        case 'input': {
          if (!session) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'No active session',
            } as WebSocketResponse));
            return;
          }

          // Validate input data
          const inputValidation = validateInputData(msg.data);
          if (!inputValidation.valid) {
            logValidationFailure('input', 'data', inputValidation.error!, msg.data);
            ws.send(JSON.stringify({
              type: 'error',
              error: inputValidation.error,
            } as WebSocketResponse));
            return;
          }

          ptyManager.write(sessionId, inputValidation.data!);
          break;
        }

        case 'resize': {
          // Validate resize dimensions
          const resizeValidation = validateTerminalDimensions(msg.cols, msg.rows);
          if (!resizeValidation.valid) {
            logValidationFailure('resize', 'cols/rows', resizeValidation.error!, msg);
            ws.send(JSON.stringify({
              type: 'error',
              error: resizeValidation.error,
            } as WebSocketResponse));
            return;
          }

          ptyManager.resize(sessionId, resizeValidation.cols!, resizeValidation.rows!);
          break;
        }

        case 'ping':
          // Update activity to prevent idle timeout
          if (sessionId) {
            ptyManager.updateActivity(sessionId);
          }
          ws.send(JSON.stringify({ type: 'pong' } as WebSocketResponse));
          break;

        default:
          logger.warn(`Unknown WebSocket message type: ${msg.type}`);
      }
    } catch (error) {
      logger.error('Error processing WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    logger.debug(`WebSocket connection closed for session ${sessionId}`);
    ptyManager.terminateSession(sessionId);
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    logger.error('WebSocket error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    ptyManager.terminateSession(sessionId);
  });
});

// Helper function to extract token from WebSocket request
function extractTokenFromRequest(req: any): string | null {
  // Try to get from cookie header
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  // Try to get from authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to get from query parameter (fallback for WebSocket)
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  return token;
}

// Cleanup idle sessions every 5 minutes
setInterval(() => {
  ptyManager.cleanupIdleSessions();
  if (config.authEnabled) {
    cleanupExpiredSessions();
  }
}, 5 * 60 * 1000);

// Start server
server.listen(config.port, () => {
  const protocol = config.useHttps ? 'HTTPS' : 'HTTP';
  const wsProtocol = config.useHttps ? 'WSS' : 'WS';

  logger.info(`
╔═══════════════════════════════════════════════════════╗
║         Web Shell Backend Server                      ║
╠═══════════════════════════════════════════════════════╣
║  Protocol:    ${protocol} / ${wsProtocol}                                ║
║  Port:        ${config.port}                                    ║
║  Environment: ${config.nodeEnv}                      ║
║  Auth:        ${config.authEnabled ? 'Enabled (Password)' : 'Disabled (Dev Mode)'}  ║
║  CORS:        ${config.corsOrigins.join(', ')}      ║
║  Session:     ${config.sessionExpiry}                               ║
╚═══════════════════════════════════════════════════════╝
  `);

  if (config.useHttps) {
    logger.info('🔒 Secure connections enabled (HTTPS/WSS)');
    logger.info(`   SSL Key:  ${config.sslKeyPath}`);
    logger.info(`   SSL Cert: ${config.sslCertPath}`);
  } else {
    logger.warn('⚠️  INSECURE: Running without HTTPS (development only)');
    logger.warn('   Set USE_HTTPS=true for production deployment');
  }
});

// Start HTTP redirect server if configured
if (httpRedirectServer) {
  httpRedirectServer.listen(config.httpPort, () => {
    logger.info(`🔀 HTTP redirect server listening on port ${config.httpPort}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Main server closed');

    // Close HTTP redirect server if running
    if (httpRedirectServer) {
      httpRedirectServer.close(() => {
        logger.info('HTTP redirect server closed');
      });
    }

    // Clean up all PTY sessions
    const sessions = ptyManager.getAllSessions();
    sessions.forEach(s => ptyManager.terminateSession(s.sessionId));
    process.exit(0);
  });
});
