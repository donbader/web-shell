# Implementation Workflow - SuperClaude Execution Plan

## Wave Strategy: PROGRESSIVE + SYSTEMATIC

**Rationale**: Building incrementally from core foundation → feature layers → production hardening
- Each phase delivers working, testable milestone
- Clear validation gates between phases
- Risk mitigation through early integration testing

## Phase Breakdown with Agent Delegation

### PHASE 1: Foundation Setup (Week 1)
**Goal**: Project scaffolding + basic infrastructure

**Complexity**: LOW | **Agent**: backend-architect + frontend-architect
**Parallelization**: High (frontend/backend independent setup)

**Tasks**:
1. **Initialize Git Repository**
   - `git init` + initial commit
   - Create feature branch: `feature/project-setup`
   - `.gitignore` configuration

2. **Frontend Scaffold** (Parallel)
   - Vite + React + TypeScript initialization
   - Install core dependencies: react, xterm.js, @react-oauth/google
   - Basic project structure creation
   - TypeScript configuration
   - Vite dev server validation

3. **Backend Scaffold** (Parallel)
   - Node.js + Express + TypeScript initialization
   - Install core dependencies: express, ws, node-pty, google-auth-library
   - Basic project structure creation
   - TypeScript configuration
   - Express server validation

4. **Environment Configuration**
   - `.env.example` templates (frontend + backend)
   - Environment variable documentation
   - Config validation utilities

**Validation Gate**: 
- ✅ Both dev servers start successfully
- ✅ TypeScript compilation passes
- ✅ Basic health check endpoints respond

**Serena Memory**: Write `phase1_foundation.md` with setup decisions

---

### PHASE 2: Google OAuth Integration (Week 1-2)
**Goal**: Complete authentication flow working end-to-end

**Complexity**: MEDIUM | **Agent**: security-engineer + backend-architect
**Parallelization**: Medium (frontend/backend sequential for auth flow)

**Tasks**:
1. **Google Cloud Console Setup**
   - Create GCP project
   - Enable Google Identity APIs
   - Create OAuth 2.0 credentials
   - Configure authorized origins/redirects
   - Document Client ID/Secret

2. **Backend Auth Service** (Sequential)
   - Google ID token verification service
   - Session JWT creation service
   - Auth controller endpoints (`POST /api/auth/google`)
   - Auth middleware for protected routes
   - Error handling for auth failures

3. **Frontend Auth Components** (After backend ready)
   - GoogleOAuthProvider wrapper
   - GoogleSignIn component
   - AuthContext for state management
   - Protected route wrapper
   - Login/logout UI flow

4. **Integration Testing**
   - Complete OAuth flow validation
   - Token refresh handling
   - Session expiration testing
   - Error scenario coverage

**Validation Gate**:
- ✅ Google Sign-In button triggers OAuth flow
- ✅ ID token validated server-side
- ✅ Session JWT created and stored
- ✅ Protected routes reject unauthenticated requests

**Serena Memory**: Write `auth_implementation.md` with OAuth patterns

---

### PHASE 3: Core Terminal (Single Window) (Week 2)
**Goal**: Single terminal with real-time shell execution

**Complexity**: HIGH | **Agent**: backend-architect + frontend-architect
**Parallelization**: Low (requires coordination)

**Tasks**:
1. **Backend PTY Manager** (First)
   - node-pty integration
   - PTY process spawning logic
   - Process lifecycle management (spawn, write, cleanup)
   - Error handling and recovery
   - Resource limit configuration

2. **WebSocket Server** (After PTY manager)
   - WebSocket server setup (ws library)
   - JWT authentication for WS connections
   - Session-to-PTY mapping
   - Message routing (input → PTY, PTY output → client)
   - Connection cleanup on disconnect

3. **Frontend Terminal Component** (Parallel with WS server)
   - xterm.js integration
   - Terminal component wrapper
   - xterm-addon-fit for responsive sizing
   - xterm-addon-web-links for clickable URLs
   - Terminal lifecycle (mount, unmount, resize)

4. **WebSocket Client** (After WS server)
   - WebSocket connection with JWT auth
   - Message send/receive handling
   - Reconnection logic
   - Error handling

5. **Integration & Testing**
   - End-to-end terminal I/O testing
   - Command execution validation
   - Error scenarios (disconnect, timeout)
   - Process cleanup verification

**Validation Gate**:
- ✅ Terminal renders in browser
- ✅ Commands execute and return output
- ✅ Interactive commands work (vim, nano)
- ✅ Process cleanup on disconnect

**Serena Memory**: Write `terminal_core.md` with PTY/WebSocket patterns

---

### PHASE 4: Multi-Window Support (Week 3)
**Goal**: Multiple concurrent terminal sessions

**Complexity**: MEDIUM | **Agent**: frontend-architect + backend-architect
**Parallelization**: Medium (state management coordination needed)

**Tasks**:
1. **Backend Session Manager** (First)
   - Multi-session tracking (Map<sessionId, ptyProcess>)
   - Session ID generation
   - Session lifecycle management
   - Resource limits per user (max sessions)
   - Idle session cleanup

2. **WebSocket Session Multiplexing** (After session manager)
   - Message routing by session ID
   - Multiple PTY process management
   - Session creation/destruction API
   - Session state broadcasting

3. **Frontend Window Manager** (Parallel)
   - Tab-based layout component
   - Window state management (array of sessions)
   - Add/remove terminal tabs
   - Active tab switching
   - localStorage persistence

4. **Multiple Terminal Instances** (After window manager)
   - Multiple xterm.js instance management
   - Per-terminal WebSocket connections
   - Session ID coordination
   - Window title customization

**Validation Gate**:
- ✅ Create multiple terminal windows
- ✅ Independent command execution per window
- ✅ Switch between active terminals
- ✅ Close terminals without affecting others
- ✅ Session state persists across page refresh

**Serena Memory**: Write `multi_window.md` with session patterns

---

### PHASE 5: Production Hardening (Week 4)
**Goal**: Security, reliability, monitoring

**Complexity**: MEDIUM | **Agent**: security-engineer + devops-architect
**Parallelization**: High (independent improvements)

**Tasks**:
1. **Security Hardening** (Parallel)
   - HTTPS/WSS configuration
   - CORS policy enforcement
   - Rate limiting middleware
   - Input sanitization
   - Domain restriction (optional)
   - Security headers (helmet.js)

2. **Error Handling** (Parallel)
   - Global error handlers
   - WebSocket error recovery
   - PTY process crash recovery
   - User-facing error messages
   - Error logging

3. **Resource Management** (Parallel)
   - CPU/memory limits per PTY
   - Max processes per terminal
   - Session timeout configuration
   - Idle session cleanup
   - Graceful shutdown handling

4. **Logging & Monitoring** (Parallel)
   - Structured logging (Winston/Pino)
   - Request logging middleware
   - Auth event logging
   - PTY lifecycle logging
   - Health check endpoints

5. **Testing & Validation**
   - Load testing (multiple concurrent users)
   - Security testing (auth bypass attempts)
   - Resource leak testing
   - Error recovery testing

**Validation Gate**:
- ✅ HTTPS/WSS working in production mode
- ✅ Rate limiting prevents abuse
- ✅ Errors handled gracefully
- ✅ Resource limits enforced
- ✅ Health checks pass

**Serena Memory**: Write `production_hardening.md` with security patterns

---

### PHASE 6: Docker Deployment (Week 5)
**Goal**: Full containerization and deployment

**Complexity**: MEDIUM | **Agent**: devops-architect
**Parallelization**: High (independent Dockerfiles)

**Tasks**:
1. **Frontend Dockerfile** (Parallel)
   - Multi-stage build (build → serve)
   - Vite production build
   - Nginx static file serving
   - Environment variable injection
   - Health check configuration

2. **Backend Dockerfile** (Parallel)
   - Multi-stage build (build → runtime)
   - TypeScript compilation
   - Alpine base image
   - Non-root user configuration
   - Security hardening

3. **docker-compose Configuration**
   - Service definitions (frontend, backend)
   - Network configuration
   - Volume mounts
   - Environment variables
   - Health checks
   - Restart policies

4. **Development Environment**
   - docker-compose.dev.yml (hot reload)
   - Volume mounts for development
   - Debug port exposure
   - Development-specific env vars

5. **Deployment Documentation**
   - Setup instructions
   - Environment variable guide
   - SSL/TLS certificate setup
   - Backup/restore procedures
   - Troubleshooting guide

**Validation Gate**:
- ✅ `docker-compose up` builds and starts services
- ✅ Frontend accessible via browser
- ✅ Backend API responds correctly
- ✅ WebSocket connections work
- ✅ Google OAuth flow completes
- ✅ Terminal sessions work in container

**Serena Memory**: Write `docker_deployment.md` with container patterns

---

## Agent Delegation Strategy

### Phase-Agent Mapping
```yaml
Phase_1_Foundation:
  primary: [backend-architect, frontend-architect]
  parallel: true
  coordination: minimal

Phase_2_OAuth:
  primary: [security-engineer, backend-architect]
  parallel: false
  coordination: high
  
Phase_3_Terminal:
  primary: [backend-architect, frontend-architect]
  parallel: medium
  coordination: high
  
Phase_4_MultiWindow:
  primary: [frontend-architect, backend-architect]
  parallel: medium
  coordination: medium
  
Phase_5_Hardening:
  primary: [security-engineer, devops-architect]
  parallel: true
  coordination: low
  
Phase_6_Docker:
  primary: [devops-architect]
  parallel: true
  coordination: low
```

### MCP Server Usage by Phase

**Context7**: All phases (documentation lookup)
**Sequential**: Phase 2 (OAuth flow), Phase 3 (terminal integration), Phase 5 (security analysis)
**Magic**: Phase 4 (UI components for window manager)
**Playwright**: Phase 5 (E2E testing)
**Serena**: All phases (memory management, session persistence)

---

## Quality Gates

### Phase Completion Criteria
Each phase MUST satisfy:
1. **Functional**: All features work as specified
2. **Tested**: Manual validation completed
3. **Documented**: Serena memory written with patterns
4. **Clean**: No temporary files, linting passes
5. **Committed**: Git commit with descriptive message

### Risk Mitigation
- **Early Integration**: Test auth + terminal in Phase 3
- **Security Focus**: Security-engineer review in Phase 2, 5
- **Incremental Complexity**: Single terminal before multi-window
- **Validation Gates**: No phase starts until previous completes

---

## Session Lifecycle Pattern

### Session Start
```
/sc:load → Read memories → Resume context → Continue phase
```

### During Work
```
TodoWrite → Track progress
Checkpoints every 30min → write_memory("checkpoint")
Phase completion → write_memory("phase_N_complete")
```

### Session End
```
/sc:save → Persist state → Document decisions → Clean workspace
```

---

## Implementation Flags

### Recommended Flag Combinations by Phase

**Phase 1**: `--orchestrate` (tool optimization)
**Phase 2**: `--think` (OAuth complexity), `--c7` (Google docs)
**Phase 3**: `--think-hard` (PTY/WebSocket integration), `--seq`
**Phase 4**: `--magic` (UI components), `--task-manage`
**Phase 5**: `--validate` (security critical), `--think-hard`
**Phase 6**: `--c7` (Docker docs), `--orchestrate`

---

## Success Metrics

### Phase 1
- Dev servers running: 100%
- TypeScript errors: 0
- Time: <2 hours

### Phase 2
- Auth flow success rate: 100%
- Token validation: server-side only
- Security: OAuth best practices followed

### Phase 3
- Terminal responsiveness: <100ms latency
- Command execution: 100% success
- Process cleanup: No orphaned PTYs

### Phase 4
- Concurrent sessions: 5+ per user
- Session isolation: 100%
- State persistence: Survives page refresh

### Phase 5
- Security headers: All critical headers set
- Rate limiting: Prevents >100 req/min
- Error recovery: Graceful degradation

### Phase 6
- Container build: <5 minutes
- Image size: <500MB total
- Startup time: <10 seconds
