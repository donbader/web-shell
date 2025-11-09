# Web Shell Deployment Fix - Multiple Issues

## Issue 1: API URL Localhost Blocking

### Problem
After deploying to main-router at `http://192.168.16.7:8888/corey-private-router/web-shell`, login fails with:
```
POST http://localhost:8888/corey-private-router/web-shell-api/api/auth/login
net::ERR_BLOCKED_BY_CLIENT
```

**Root Cause**: Frontend was built with hardcoded `localhost` URLs, which the browser blocks when accessing from `192.168.16.7`.

### Solution Applied

**File**: `/home/corey/Projects/main-router/services/web-shell.yml`

Removed hardcoded localhost build args to allow dynamic URL construction (lines 106-108 commented out).

## Issue 2: Shell Parameter Validation Error

### Problem
After successful login, terminal shows:
```
Connecting to server...
Error: Shell must be a string
```

**Root Cause**: Old localStorage data from pre-authentication sessions was missing `shell` and `environment` fields. The backend validation rejected `undefined` values.

### Solution Applied

**File**: `/home/corey/Projects/web-shell/frontend/src/components/WindowManager.tsx`

Added localStorage migration logic (lines 42-50) to ensure all windows have default `shell: 'zsh'` and `environment: 'default'` values:

```typescript
// Migrate old data: ensure all windows have shell and environment
if (parsed.windows) {
  parsed.windows = parsed.windows.map((w: TerminalWindowData) => ({
    ...w,
    shell: w.shell || 'zsh', // Default to zsh if missing
    environment: w.environment || 'default', // Default to default if missing
  }));
}
```

## Issue 3: ImageService Localhost Blocking

### Problem
Image check API calls used hardcoded `localhost:3366`, causing browser blocking:
```
GET http://localhost:3366/api/images/check/default net::ERR_BLOCKED_BY_CLIENT
```

**Root Cause**: Services (`imageService.ts`, `environmentService.ts`) had hardcoded localhost fallbacks.

### Solution Applied

Created shared utility and updated all services:

**File Created**: `/home/corey/Projects/web-shell/frontend/src/utils/apiUrl.ts`

**Files Updated**: `imageService.ts`, `environmentService.ts`, `Login.tsx`, `App.tsx`

## Issue 4: Docker Socket Proxy Permission Error

### Problem
When terminal attempts to build environment image, fails with:
```
Error: Failed to build image: (HTTP code 403) unexpected - 403 Forbidden
Request forbidden by administrative rules.
```

**Root Cause**: Docker socket proxy requires `POST=1` environment variable to allow write operations (create, build, exec). Having `BUILD=1` alone only grants access to the `/build` API section but doesn't enable POST requests.

### Solution Applied

**File**: `/home/corey/Projects/main-router/services/web-shell.yml`

Added `POST: 1` to docker-proxy environment variables (line 19):

```yaml
environment:
  # Grant minimal permissions needed
  CONTAINERS: 1
  EXEC: 1
  IMAGES: 1
  BUILD: 1
  VOLUMES: 1
  NETWORKS: 1
  INFO: 1
  POST: 1  # Required for write operations (create, build, exec, etc.)
```

**Security Note**: `POST=1` enables write operations but is restricted to the enabled API sections (CONTAINERS, EXEC, IMAGES, BUILD, etc.). Dangerous operations like COMMIT, SECRETS, SWARM remain disabled.

## Deployment Steps

```bash
# 1. Navigate to main-router services directory
cd /home/corey/Projects/main-router

# 2. Restart web-shell services with updated Traefik configuration
docker compose -f services/web-shell.yml down
docker compose -f services/web-shell.yml up -d

# 3. Monitor logs to verify WebSocket connection
docker compose -f services/web-shell.yml logs -f backend

# 4. Test the application
# Navigate to: http://192.168.16.7:8888/corey-private-router/web-shell
# Username: donbader
# Password: Corey*666
# Should now connect successfully and show terminal
```

## Verification

After deployment, check browser console and network tab:
- ✅ Should see: WebSocket connection upgrade at `ws://192.168.16.7:8888/corey-private-router/web-shell-api`
- ✅ Should see: "WebSocket Connected" in console
- ✅ Should see: Terminal session created with session ID
- ❌ Should NOT see: Connection errors or "Connecting to server..." stuck state

Backend logs should show:
- ✅ WebSocket connection from user
- ✅ Session created with session ID
- ✅ PTY stream started

Network tab should show successful WebSocket upgrade (status 101 Switching Protocols).

## Why This Happened

The main-router setup needs to work from:
- LAN access: `http://192.168.16.7:8888`
- Localhost access: `http://localhost:8888`
- Potential domain access: `http://yourdomain.com`

Hardcoding `localhost` in build args breaks LAN access. Dynamic construction handles all scenarios.

## Issue 5: WebSocket Connection Stuck & Container Creation Failure

### Problem
After successful login, terminal shows "Connecting to server..." indefinitely. Backend logs show:
```
Failed to create container
Failed to create PTY session
```

**Root Causes**:
1. **Traefik WebSocket Headers**: Missing `passhostheader=true` prevented WebSocket upgrade handshake
2. **Docker Network Mismatch**: Session containers attempted to join `web-shell_web-shell-network` which doesn't exist in main-router deployment. Backend needed to use environment-driven network configuration.

### Solutions Applied

**File 1**: `/home/corey/Projects/main-router/services/web-shell.yml`

Added WebSocket support and network configuration (lines 59, 99-102):

```yaml
# Backend environment variables
environment:
  - DOCKER_NETWORK=main-router-network  # Session containers join this network

# Backend service configuration with WebSocket support
- "traefik.http.services.web-shell-backend-service.loadbalancer.server.port=3366"
- "traefik.http.services.web-shell-backend-service.loadbalancer.passhostheader=true"

# Network definitions
networks:
  main-router-network:
    external: true
  docker-proxy-network:
    driver: bridge
```

**File 2**: `/home/corey/Projects/web-shell/backend/src/services/containerManager.ts`

Changed hardcoded network to environment variable (line 80):

```typescript
// Before: NetworkMode: 'web-shell_web-shell-network',
// After:
NetworkMode: process.env.DOCKER_NETWORK || 'bridge',
```

**File 3**: `/home/corey/Projects/web-shell/docker-compose.dev.yml`

Added network configuration for local development (line 63):

```yaml
environment:
  - DOCKER_NETWORK=web-shell-network  # Local dev network
```

**Technical Details**:
- Traefik requires `passhostheader=true` to preserve Host headers during WebSocket upgrade
- WebSocket connections need HTTP → WebSocket protocol upgrade handshake
- Session containers must join same network as backend for communication
- Environment variable allows deployment-specific network configuration
- Backend is environment-agnostic, deployment context controls network assignment

## Related Files

- `/home/corey/Projects/main-router/services/web-shell.yml` - Deployment config (FIXED)
- `/home/corey/Projects/web-shell/frontend/src/App.tsx` - Dynamic URL construction
- `/home/corey/Projects/web-shell/frontend/src/components/Login.tsx` - Dynamic URL construction
- `/home/corey/Projects/web-shell/deploy-to-main-router.sh` - Deployment script
