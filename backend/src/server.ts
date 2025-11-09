import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/config.js';
import ptyManager from './services/ptyManager.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import environmentRoutes from './routes/environments.js';
import imageRoutes from './routes/images.js';
import {
  initializeDefaultUser,
  verifyToken,
  cleanupExpiredSessions,
} from './services/authService.js';
import { WebSocketMessage, WebSocketResponse } from './types/index.js';
import { randomUUID } from 'crypto';

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
    console.log('[Server] HTTPS enabled with SSL certificates');

    // Create HTTP to HTTPS redirect server
    if (config.nodeEnv === 'production') {
      httpRedirectServer = createHttpServer((req, res) => {
        const host = req.headers.host?.split(':')[0] || 'localhost';
        const redirectUrl = `https://${host}:${config.port}${req.url}`;
        res.writeHead(301, { Location: redirectUrl });
        res.end();
      });
      console.log(`[Server] HTTP→HTTPS redirect enabled on port ${config.httpPort}`);
    }
  } catch (error) {
    console.error('[Server] CRITICAL ERROR: Failed to load SSL certificates');
    console.error(`[Server] Key path: ${config.sslKeyPath}`);
    console.error(`[Server] Cert path: ${config.sslCertPath}`);
    console.error(`[Server] Error: ${error}`);
    console.error('[Server] Generate self-signed certificates with:');
    console.error('[Server]   mkdir -p backend/certs && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\');
    console.error('[Server]     -keyout backend/certs/key.pem -out backend/certs/cert.pem');
    process.exit(1);
  }
} else {
  server = createHttpServer(app);
  console.log('[Server] HTTP mode (development)');
}

const wss = new WebSocketServer({ server });

// Initialize default user if auth is enabled
if (config.authEnabled) {
  initializeDefaultUser();
}

// Middleware
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
    console.log(`[WebSocket] Connection from dev user`);
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
    console.log(`[WebSocket] Connection from user: ${userId}`);
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

      switch (msg.type) {
        case 'create-session':
          // Create terminal session with requested shell/environment
          sessionId = randomUUID();
          session = await ptyManager.createSession(
            userId,
            sessionId,
            msg.cols || 80,
            msg.rows || 24,
            msg.shell,
            msg.environment
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
            console.log(`[PTY] Stream ended for session ${sessionId}`);
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

        case 'input':
          if (msg.data && session) {
            ptyManager.write(sessionId, msg.data);
          }
          break;

        case 'resize':
          if (msg.cols && msg.rows) {
            ptyManager.resize(sessionId, msg.cols, msg.rows);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' } as WebSocketResponse));
          break;

        default:
          console.warn('[WebSocket] Unknown message type:', msg.type);
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`[WebSocket] Connection closed for session ${sessionId}`);
    ptyManager.terminateSession(sessionId);
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error);
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

  console.log(`
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
    console.log('🔒 Secure connections enabled (HTTPS/WSS)');
    console.log(`   SSL Key:  ${config.sslKeyPath}`);
    console.log(`   SSL Cert: ${config.sslCertPath}`);
  } else {
    console.log('⚠️  INSECURE: Running without HTTPS (development only)');
    console.log('   Set USE_HTTPS=true for production deployment');
  }
});

// Start HTTP redirect server if configured
if (httpRedirectServer) {
  httpRedirectServer.listen(config.httpPort, () => {
    console.log(`🔀 HTTP redirect server listening on port ${config.httpPort}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Main server closed');

    // Close HTTP redirect server if running
    if (httpRedirectServer) {
      httpRedirectServer.close(() => {
        console.log('[Server] HTTP redirect server closed');
      });
    }

    // Clean up all PTY sessions
    const sessions = ptyManager.getAllSessions();
    sessions.forEach(s => ptyManager.terminateSession(s.sessionId));
    process.exit(0);
  });
});
