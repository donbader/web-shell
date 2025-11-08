# Architecture Design - Technical Specification

## System Architecture

### Component Layers

**Presentation Layer (Browser)**
- React SPA with xterm.js terminal emulator
- Google OAuth Sign-In UI component
- Multi-window tab/grid manager
- WebSocket client for real-time I/O

**Application Layer (Node.js Backend)**
- Express HTTP server (API + static files)
- WebSocket server (terminal I/O)
- PTY process manager (shell spawning)
- Session manager (terminal tracking)
- Auth middleware (JWT validation)

**Infrastructure Layer**
- Docker containers (frontend build + backend runtime)
- Alpine Linux base images
- docker-compose orchestration
- Optional: Nginx reverse proxy

## Data Flow Architecture

### Authentication Flow
```
User → Google Sign-In → ID Token → Backend Validation → Session JWT → WebSocket Auth → Terminal Access
```

### Terminal I/O Flow
```
User Input → xterm.js → WebSocket → Server → PTY → Shell
Shell Output → PTY → Server → WebSocket → xterm.js → Display
```

### Multi-Window Session Management
```
Client: windowState[] → Multiple xterm.js instances
Server: sessionMap<id, ptyProcess> → Independent shell processes
Protocol: WebSocket messages tagged with sessionId
```

## Security Architecture

### Defense in Depth
1. **Perimeter**: Google OAuth (no password storage)
2. **Transport**: HTTPS/WSS encryption
3. **Application**: JWT validation, rate limiting
4. **Process**: Non-root user, resource limits
5. **Container**: Isolated environment, read-only filesystem

### Authentication Chain
1. Google validates user identity (with 2FA if enabled)
2. Backend verifies Google ID token (server-side, critical)
3. Backend creates session JWT (internal auth)
4. WebSocket validates JWT before connection upgrade
5. PTY spawns with user context

### Resource Protection
- CPU limits per PTY process
- Memory limits per terminal session
- Max concurrent sessions per user
- Idle session timeout and cleanup
- Rate limiting on API endpoints

## Project Structure

```
web-shell/
├── frontend/                    # React + TypeScript
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── Terminal.tsx    # xterm.js wrapper
│   │   │   ├── TerminalWindow.tsx
│   │   │   ├── WindowManager.tsx
│   │   │   ├── GoogleSignIn.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── services/           # API clients
│   │   │   ├── websocket.ts
│   │   │   ├── auth.ts
│   │   │   └── terminal.ts
│   │   ├── context/            # State management
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useTerminal.ts
│   │   │   └── useAuth.ts
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                     # Node.js + TypeScript
│   ├── src/
│   │   ├── server.ts           # Express + WebSocket setup
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── services/
│   │   │   ├── googleAuthService.ts
│   │   │   ├── ptyManager.ts
│   │   │   ├── sessionManager.ts
│   │   │   └── authService.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── rateLimit.ts
│   │   ├── config/
│   │   │   ├── config.ts
│   │   │   └── google.config.ts
│   │   ├── types/
│   │   └── utils/
│   │       └── logger.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── .serena/                     # Serena project config
│   └── project.yml
├── .gitignore
└── README.md
```

## Technology Stack Details

### Frontend Stack
- **React 18**: UI framework
- **Vite**: Build tool (fast HMR)
- **TypeScript**: Type safety
- **xterm.js**: Terminal emulator
- **@react-oauth/google**: Google Sign-In
- **CSS Modules/Tailwind**: Styling

### Backend Stack
- **Node.js 20 LTS**: Runtime
- **Express**: HTTP framework
- **ws**: WebSocket library
- **node-pty**: PTY (pseudo-terminal)
- **google-auth-library**: Token validation
- **jsonwebtoken**: Session JWT
- **TypeScript**: Type safety

### DevOps Stack
- **Docker**: Containerization
- **docker-compose**: Orchestration
- **Alpine Linux**: Base image
- **Multi-stage builds**: Optimization
