import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import config from './config/config.js';
import ptyManager from './services/ptyManager.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { WebSocketMessage, WebSocketResponse } from './types/index.js';
import { randomUUID } from 'crypto';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes with auth
app.get('/api/sessions', authMiddleware, (req, res) => {
  const sessions = ptyManager.getUserSessions(req.user!.userId);
  res.json({
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
    })),
  });
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  let userId: string;
  let sessionId: string;

  // Dev mode: Auto-assign user
  if (!config.authEnabled) {
    userId = 'dev-user';
    console.log(`[WebSocket] Connection from dev user`);
  } else {
    // Production mode: JWT validation will be added in Phase 6
    ws.close(1008, 'Authentication required');
    return;
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

  // Create new terminal session
  sessionId = randomUUID();
  const session = ptyManager.createSession(userId, sessionId);

  // Send session created message
  ws.send(JSON.stringify({
    type: 'session-created',
    sessionId,
  } as WebSocketResponse));

  // Forward PTY output to WebSocket
  session.ptyProcess.onData((data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'output',
        sessionId,
        data,
      } as WebSocketResponse));
    }
  });

  // Handle PTY process exit
  session.ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
    console.log(`[PTY] Process exited: code=${exitCode}, signal=${signal}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        error: `Terminal process exited with code ${exitCode}`,
      } as WebSocketResponse));
    }
    ptyManager.terminateSession(sessionId);
    ws.close();
  });

  // Handle WebSocket messages
  ws.on('message', (message: Buffer) => {
    try {
      const msg = JSON.parse(message.toString()) as WebSocketMessage;

      switch (msg.type) {
        case 'input':
          if (msg.data) {
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

// Cleanup idle sessions every 5 minutes
setInterval(() => {
  ptyManager.cleanupIdleSessions();
}, 5 * 60 * 1000);

// Start server
server.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         Web Shell Backend Server                      ║
╠═══════════════════════════════════════════════════════╣
║  Port:        ${config.port}                                    ║
║  Environment: ${config.nodeEnv}                      ║
║  Auth:        ${config.authEnabled ? 'Enabled (OAuth)' : 'Disabled (Dev Mode)'}  ║
║  CORS:        ${config.corsOrigins.join(', ')}      ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    // Clean up all PTY sessions
    const sessions = ptyManager.getAllSessions();
    sessions.forEach(s => ptyManager.terminateSession(s.sessionId));
    process.exit(0);
  });
});
