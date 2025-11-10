# Docker Image Build Fix

## Issue
When accessing the web shell at `localhost:5173`, the minimal environment failed to create sessions with the error:
```
Failed to build image web-shell-backend:minimal
Error building image
```

## Root Cause
The backend container manager expects a `/build-context` directory to be mounted, which contains the Dockerfile and environment configurations needed to build session images. This mount was missing from `docker-compose.dev.yml`.

## Solution
Added the build context volume mount to the backend service in `docker-compose.dev.yml`:

```yaml
volumes:
  - ./backend:/app
  - backend-node-modules:/app/node_modules
  - ./backend:/build-context:ro  # Build context for dynamic image building
```

## Files Modified
- `/home/corey/Projects/web-shell/docker-compose.dev.yml` - Added build-context volume mount

## Verification
After the fix:
1. Restarted the backend container: `docker compose -f docker-compose.dev.yml up -d backend`
2. The `/build-context` directory is now accessible in the container
3. Image builds now work correctly:
   ```bash
   docker images | grep web-shell-backend
   web-shell-backend   minimal   26a6be5ceb7a   58 seconds ago   597MB
   web-shell-backend   default   77cfbe271821   39 minutes ago   601MB
   ```

## Build Time
Note that building images takes 1-2 minutes on first use. The initial error shown in the browser occurs because the image doesn't exist yet and the build is in progress. Subsequent sessions using the same environment will start immediately.

## Date
2025-11-10
