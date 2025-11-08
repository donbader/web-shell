# Implementation Workflow - REVISED (OAuth Last)

## Wave Strategy: PROGRESSIVE + SYSTEMATIC

**User Preference**: See terminal functionality working BEFORE adding Google OAuth complexity
**Approach**: Auth-optional architecture with dev/prod modes

---

## REVISED Phase Breakdown

### PHASE 1: Foundation Setup (Week 1)
**Goal**: Project scaffolding + basic infrastructure

**Complexity**: LOW | **Agent**: backend-architect + frontend-architect
**Parallelization**: ✅ High (frontend/backend independent)

**Tasks**:
1. Initialize Git Repository (✅ COMPLETED)
2. Frontend Scaffold (Parallel)
   - Vite + React + TypeScript initialization
   - Install: react, xterm.js, xterm-addon-fit, xterm-addon-web-links
   - Basic project structure
   - TypeScript configuration
   - Vite dev server validation

3. Backend Scaffold (Parallel)
   - Node.js + Express + TypeScript initialization
   - Install: express, ws, node-pty, dotenv
   - Basic project structure
   - TypeScript configuration
   - Express server validation

4. Environment Configuration
   - `.env.example` with AUTH_ENABLED flag
   - Dev mode defaults (AUTH_ENABLED=false)
   - Config validation utilities

**Validation Gate**:
- ✅ Both dev servers start successfully
- ✅ TypeScript compilation passes
- ✅ Basic health check endpoints respond

**Serena Memory**: Write `phase1_foundation.md`

---

### PHASE 2: Core Terminal - Single Window (Week 1-2)
**Goal**: Working terminal with real-time shell execution (NO AUTH)

**Complexity**: HIGH | **Agent**: backend-architect + frontend-architect
**Parallelization**: ⚠️ Low (tight coordination needed)

**Priority**: 🚀 HIGH - This gives immediate visible results!

**Tasks**:
1. **Backend PTY Manager** (First)
   - node-pty integration
   - PTY process spawning (single instance)
   - Process lifecycle (spawn, write, cleanup)
   - Error handling
   - Resource limit configuration

2. **Backend WebSocket Server** (After PTY)
   - WebSocket server setup (ws library)
   - Dev mode: No auth check (AUTH_ENABLED=false)
   - Mock user assignment: `{ userId: 'dev-user' }`
   - Single session-to-PTY mapping
   - Message routing (input → PTY, output → client)
   - Connection cleanup on disconnect

3. **Frontend Terminal Component** (Parallel with WS)
   - xterm.js integration
   - Terminal.tsx wrapper component
   - xterm-addon-fit (responsive sizing)
   - xterm-addon-web-links (clickable URLs)
   - Terminal lifecycle hooks

4. **Frontend WebSocket Client** (After WS server)
   - WebSocket connection (no auth token needed in dev)
   - Message send/receive handling
   - Reconnection logic
   - Error handling and display

5. **Integration Testing**
   - End-to-end terminal I/O
   - Command execution validation
   - Interactive commands (vim, nano, htop)
   - Process cleanup verification
   - Error scenarios

**Dev Mode Implementation**:
```typescript
// Backend: Auto-assign dev user
if (process.env.AUTH_ENABLED === 'false') {
  ws.userId = 'dev-user';
  ws.email = 'dev@localhost';
}

// Frontend: Direct WebSocket connection
const ws = new WebSocket('ws://localhost:3000');
// No token needed in dev mode
```

**Validation Gate**:
- ✅ Terminal renders in browser
- ✅ Commands execute and return output in real-time
- ✅ Interactive commands work (vim, nano)
- ✅ Process cleanup on disconnect
- ✅ **USER CAN SEE IT WORKING!** 🎉

**Serena Memory**: Write `terminal_core.md`

---

### PHASE 3: Multi-Window Support (Week 2-3)
**Goal**: Multiple concurrent terminal sessions

**Complexity**: MEDIUM | **Agent**: frontend-architect + backend-architect
**Parallelization**: ⚠️ Medium (state coordination needed)

**Tasks**:
1. **Backend Session Manager** (First)
   - Multi-session tracking Map<sessionId, ptyProcess>
   - Session ID generation (UUID)
   - Session lifecycle management
   - Resource limits per user (max 5 sessions in dev)
   - Idle session cleanup

2. **Backend WebSocket Multiplexing** (After session manager)
   - Message routing by session ID
   - Multiple PTY process management
   - Session creation/destruction API
   - Session state broadcasting

3. **Frontend Window Manager** (Parallel)
   - Tab-based layout component
   - Window state management (array of sessions)
   - Add/remove terminal tabs
   - Active tab switching
   - Tab titles and customization
   - localStorage persistence

4. **Frontend Multiple Terminals** (After window manager)
   - Multiple xterm.js instance management
   - Independent WebSocket connections per tab
   - Session ID coordination
   - Window-specific state

**Validation Gate**:
- ✅ Create 5+ terminal windows
- ✅ Independent command execution per window
- ✅ Switch between active terminals
- ✅ Close terminals without affecting others
- ✅ Session state persists across page refresh
- ✅ **USER SEES MULTI-WINDOW WORKING!** 🎉

**Serena Memory**: Write `multi_window.md`

---

### PHASE 4: Production Hardening (Week 3)
**Goal**: Security, reliability, monitoring (Auth still optional)

**Complexity**: MEDIUM | **Agent**: security-engineer + devops-architect
**Parallelization**: ✅ High (independent improvements)

**Tasks**:
1. **HTTPS/WSS Configuration** (Parallel)
   - HTTPS server setup (self-signed cert for dev)
   - WSS (WebSocket Secure) upgrade
   - HTTP to HTTPS redirect
   - Environment-based protocol selection

2. **Security Headers** (Parallel)
   - helmet.js integration
   - CSP (Content Security Policy)
   - HSTS headers
   - XSS protection headers

3. **Rate Limiting** (Parallel)
   - IP-based rate limiting (no user auth needed yet)
   - Request throttling
   - WebSocket connection limits
   - Configurable limits

4. **Error Handling** (Parallel)
   - Global error handlers
   - WebSocket error recovery
   - PTY crash recovery
   - User-facing error messages
   - Error logging

5. **Resource Management** (Parallel)
   - CPU/memory limits per PTY
   - Max processes per terminal
   - Session timeout configuration
   - Idle session cleanup (30min default)
   - Graceful shutdown handling

6. **Logging & Monitoring** (Parallel)
   - Structured logging (Winston or Pino)
   - Request logging middleware
   - PTY lifecycle logging
   - Performance metrics
   - Health check endpoints (/health, /ready)

**Validation Gate**:
- ✅ HTTPS/WSS working locally
- ✅ Security headers present
- ✅ Rate limiting prevents abuse
- ✅ Errors handled gracefully
- ✅ Resource limits enforced
- ✅ Health checks pass
- ✅ Logs capture important events

**Serena Memory**: Write `production_hardening.md`

---

### PHASE 5: Docker Deployment (Week 4)
**Goal**: Full containerization (Auth still optional)

**Complexity**: MEDIUM | **Agent**: devops-architect
**Parallelization**: ✅ High (independent Dockerfiles)

**Tasks**:
1. **Frontend Dockerfile** (Parallel)
   - Multi-stage build (build → serve)
   - Vite production build
   - Nginx for static files
   - Environment variable injection
   - Health check configuration

2. **Backend Dockerfile** (Parallel)
   - Multi-stage build (build → runtime)
   - TypeScript compilation
   - Alpine Linux base
   - Non-root user setup
   - Security hardening

3. **docker-compose Configuration**
   - Service definitions (frontend, backend)
   - Network configuration
   - Volume mounts (optional persistence)
   - Environment variables
   - Health checks
   - Restart policies
   - AUTH_ENABLED=false for demo

4. **Development Environment**
   - docker-compose.dev.yml
   - Hot reload support
   - Volume mounts for code
   - Debug port exposure
   - Development env vars

5. **Documentation**
   - Setup instructions
   - Environment variable guide
   - Docker commands
   - Troubleshooting

**Validation Gate**:
- ✅ `docker-compose up` builds successfully
- ✅ Frontend accessible in browser
- ✅ Backend API responds
- ✅ WebSocket connections work
- ✅ Terminal sessions work in container
- ✅ **FULLY CONTAINERIZED DEMO READY!** 🎉

**Serena Memory**: Write `docker_deployment.md`

---

### PHASE 6: Google OAuth Integration (Week 4-5)
**Goal**: Add production-grade authentication (FINAL PHASE)

**Complexity**: MEDIUM | **Agent**: security-engineer + backend-architect
**Parallelization**: ⚠️ Medium (sequential auth flow)

**Priority**: 🔐 Security enhancement (non-breaking addition)

**Tasks**:
1. **Google Cloud Console Setup**
   - Create GCP project
   - Enable Google Identity APIs
   - Create OAuth 2.0 credentials
   - Configure authorized origins
   - Document Client ID/Secret

2. **Backend Auth Service**
   - Install: google-auth-library, jsonwebtoken
   - Google ID token verification service
   - Session JWT creation service
   - Auth controller: POST /api/auth/google
   - Auth middleware for protected routes
   - Update WebSocket to validate JWT

3. **Frontend Auth Components**
   - Install: @react-oauth/google
   - GoogleOAuthProvider wrapper
   - GoogleSignIn component
   - AuthContext for state management
   - Protected route wrapper
   - Login/logout UI flow

4. **Auth Mode Integration**
   - Update AUTH_ENABLED flag logic
   - Dev mode: Keep auto-login (AUTH_ENABLED=false)
   - Prod mode: Require Google OAuth (AUTH_ENABLED=true)
   - Environment-based switching
   - Clear security warnings

5. **Testing**
   - Complete OAuth flow validation
   - Token refresh handling
   - Session expiration testing
   - Error scenarios
   - Both modes tested (dev + prod)

**Validation Gate**:
- ✅ Google Sign-In button works
- ✅ ID token validated server-side
- ✅ Session JWT created and stored
- ✅ Protected routes enforce auth
- ✅ WebSocket validates JWT in prod mode
- ✅ Dev mode still works without OAuth
- ✅ **PRODUCTION-READY WITH AUTH!** 🎉

**Serena Memory**: Write `oauth_integration.md`

---

## Key Changes from Original Plan

### What Changed
- ✅ OAuth moved from Phase 2 → Phase 6 (last)
- ✅ Core Terminal moved from Phase 3 → Phase 2 (earlier)
- ✅ Multi-Window moved from Phase 4 → Phase 3 (earlier)
- ✅ Docker moved from Phase 6 → Phase 5 (before OAuth)
- ✅ Auth-optional architecture (AUTH_ENABLED flag)

### Why This is Better
- 🚀 See results faster (terminal working by Phase 2)
- 🔧 Simpler debugging (no auth complexity early)
- 📊 Better testing (focus on core features first)
- 🎯 Demo-ready earlier (Phases 2-5 fully functional)
- 🔐 Auth is additive, not foundational (less risk)

---

## Auth-Optional Architecture

### Development Mode (Phases 1-5)
```typescript
// .env
AUTH_ENABLED=false

// Backend behavior
- Auto-assign mock user: { userId: 'dev-user', email: 'dev@localhost' }
- Skip JWT validation
- WebSocket allows connections without token
- All features work without login UI

// Frontend behavior
- No login screen
- Direct access to terminal interface
- No AuthContext complexity
```

### Production Mode (Phase 6+)
```typescript
// .env
AUTH_ENABLED=true

// Backend behavior
- Require Google OAuth ID token
- Validate tokens server-side
- Create session JWT
- WebSocket requires valid JWT
- Reject unauthenticated requests

// Frontend behavior
- Show login screen first
- Google Sign-In button
- AuthContext manages user state
- Protected routes enforce auth
```

---

## Agent Delegation Strategy (REVISED)

```yaml
Phase_1_Foundation:
  primary: [backend-architect, frontend-architect]
  parallel: true
  coordination: minimal
  duration: 1 week

Phase_2_CoreTerminal:
  primary: [backend-architect, frontend-architect]
  parallel: medium
  coordination: high
  duration: 1-2 weeks
  priority: HIGH (first visible results)

Phase_3_MultiWindow:
  primary: [frontend-architect, backend-architect]
  parallel: medium
  coordination: medium
  duration: 1 week

Phase_4_Hardening:
  primary: [security-engineer, devops-architect]
  parallel: true
  coordination: low
  duration: 1 week

Phase_5_Docker:
  primary: [devops-architect]
  parallel: true
  coordination: low
  duration: 1 week

Phase_6_OAuth:
  primary: [security-engineer, backend-architect]
  parallel: medium
  coordination: high
  duration: 1-2 weeks
  priority: FINAL (production enhancement)
```

---

## Success Metrics (REVISED)

### Phase 1: Foundation
- Dev servers running: 100%
- TypeScript errors: 0
- Time: <2 hours

### Phase 2: Core Terminal ⭐ FIRST DEMO
- Terminal visible in browser: ✅
- Command execution: 100% success
- Process cleanup: No orphaned PTYs
- **USER SATISFACTION: Can see it working!**

### Phase 3: Multi-Window ⭐ SECOND DEMO
- Concurrent sessions: 5+ per user
- Session isolation: 100%
- State persistence: Page refresh survives
- **USER SATISFACTION: Full feature set visible!**

### Phase 4: Production Hardening
- Security headers: All critical present
- Rate limiting: Prevents >100 req/min
- Error recovery: Graceful degradation

### Phase 5: Docker ⭐ THIRD DEMO
- Container build: <5 minutes
- Image size: <500MB total
- Startup time: <10 seconds
- **USER SATISFACTION: Deployable demo!**

### Phase 6: Google OAuth
- Auth flow success: 100%
- Token validation: Server-side only
- Security: OAuth best practices
- **PRODUCTION READY!**

---

## Quick Start Timeline

**End of Phase 1**: Project structure ready
**End of Phase 2**: 🎉 **FIRST WORKING DEMO** - Terminal in browser
**End of Phase 3**: 🎉 **FULL FEATURE DEMO** - Multi-window terminals
**End of Phase 5**: 🎉 **DOCKER DEMO** - Containerized app
**End of Phase 6**: 🎉 **PRODUCTION** - Secure with Google OAuth
