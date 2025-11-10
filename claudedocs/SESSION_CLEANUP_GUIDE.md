# Session Cleanup Guide

**Date**: 2025-11-10
**Status**: ✅ Fully Implemented

## Overview

The web-shell application has comprehensive automatic session cleanup to ensure resources are properly released when sessions are no longer needed.

## Cleanup Scenarios

### 1. Browser Window/Tab Close ✅
**Trigger**: User closes browser tab or window
**Implementation**: `frontend/src/components/Terminal.tsx:125-129`
- `beforeunload` event listener calls `wsService.close()`
- WebSocket connection is closed gracefully
- Backend receives `close` event and terminates session

### 2. Individual Terminal Tab Close ✅
**Trigger**: User clicks X button on terminal tab within the app
**Implementation**: `frontend/src/components/WindowManager.tsx:184-194`
- Window removed from React state
- TerminalWindow component unmounts
- Terminal component cleanup function runs (lines 147-155)
- WebSocket connection closed
- Backend terminates session

### 3. WebSocket Error ✅
**Trigger**: Network error or WebSocket failure
**Implementation**: `backend/src/server.ts:337-344`
- Backend detects WebSocket error
- Automatically calls `ptyManager.terminateSession(sessionId)`
- Container and PTY session cleaned up

### 4. Idle Timeout ✅
**Trigger**: Session inactive for configured duration
**Implementation**:
- **Backend**: `backend/src/server.ts:376-382`
  - Runs every 5 minutes: `ptyManager.cleanupIdleSessions()`
  - Checks `lastActivity` timestamp
  - Terminates sessions idle > `IDLE_TIMEOUT_MINUTES` (default: 30 min in dev, 30 min in prod)
- **Activity Tracking**:
  - Input commands: `backend/src/services/ptyManager.ts:141-157`
  - Terminal resize: `backend/src/services/ptyManager.ts:110-139`
  - Ping messages: `backend/src/server.ts:316-322` (NEW)

### 5. Page Visibility Change ✅ (NEW)
**Trigger**: User switches to different browser tab
**Implementation**: `frontend/src/components/Terminal.tsx:131-145`
- Listens to `visibilitychange` event
- When tab becomes hidden: Logs message (backend will cleanup if idle too long)
- When tab becomes visible: Sends ping to update activity timestamp
- Prevents premature cleanup when user briefly switches tabs

### 6. Session Limit Exceeded ✅
**Trigger**: User tries to create more sessions than allowed
**Implementation**: `backend/src/server.ts:166-175`
- Checks `ptyManager.getUserSessions(userId).length`
- If >= `MAX_SESSIONS_PER_USER`, closes WebSocket with error
- No session created, no cleanup needed

## Backend Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. WebSocket Connection                                     │
│    - Extract auth token                                     │
│    - Verify user                                            │
│    - Check session limits                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create Session (on 'create-session' message)            │
│    - Validate dimensions, shell, environment               │
│    - Create Docker container                                │
│    - Create PTY session                                     │
│    - Set lastActivity = now                                 │
│    - Set expiresAt = now + IDLE_TIMEOUT                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Session Active                                           │
│    - Handle input → updateActivity()                        │
│    - Handle resize → updateActivity()                       │
│    - Handle ping → updateActivity() (NEW)                   │
│    - Forward output to WebSocket                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Session Termination (Multiple Triggers)                 │
│    ├─ WebSocket 'close' event                              │
│    ├─ WebSocket 'error' event                              │
│    ├─ PTY stream 'end' event                               │
│    ├─ Idle timeout (5-min cleanup check)                   │
│    └─ SIGTERM (graceful shutdown)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Cleanup                                                  │
│    - Stop Docker container (AutoRemove flag)               │
│    - Terminate PTY session                                  │
│    - Remove from sessions map                               │
│    - Volume persists for user                               │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Terminal Component Mount                                │
│    - Create WebSocketService                                │
│    - Connect to backend                                     │
│    - Send 'create-session' message                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Active Session                                           │
│    - User types → send 'input' message                      │
│    - Window resizes → send 'resize' message                 │
│    - Every 30s → send 'ping' message                        │
│    - Receive output → display in terminal                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Page Visibility (NEW)                                   │
│    - Tab hidden → log message                               │
│    - Tab visible → send 'ping'                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Cleanup Triggers                                         │
│    ├─ Component unmount (tab closed)                        │
│    ├─ beforeunload (window closed)                          │
│    ├─ WebSocket error                                       │
│    └─ WebSocket close                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Cleanup Actions                                          │
│    - Call wsService.close()                                 │
│    - Remove event listeners                                 │
│    - Clear ping interval                                    │
│    - Dispose xterm terminal                                 │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

**Backend** (`backend/src/config/config.ts`):
```typescript
IDLE_TIMEOUT_MINUTES: number (default: 30)
MAX_SESSIONS_PER_USER: number (default: 5 dev, 5 prod)
```

**Frontend** (`frontend/src/components/Terminal.tsx`):
```typescript
PING_INTERVAL: 30000 (30 seconds)
RECONNECT_ATTEMPTS: 5
RECONNECT_DELAY: 1000 (base delay, exponential backoff)
```

## Manual Cleanup

### Clear All Sessions
```bash
# Remove all terminal session containers
docker ps -a --filter "name=web-shell-session" --format "{{.ID}}" | xargs -r docker rm -f

# Check no sessions remain
docker ps -a --filter "name=web-shell-session"
```

### View Active Sessions
```bash
# List running session containers
docker ps --filter "name=web-shell-session" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Check backend logs for session info
docker logs web-shell-backend-dev --tail 50 | grep -i session
```

## Files Modified

1. **backend/src/server.ts** (lines 316-322)
   - Added activity update for ping messages
   - Prevents sessions from being marked idle when user has tab open

2. **frontend/src/components/Terminal.tsx** (lines 131-145, 151)
   - Added Page Visibility API support
   - Sends ping when user returns to tab
   - Properly cleans up visibility event listener

## Testing

### Test Scenarios

1. **Close Terminal Tab**: ✅
   - Click X on terminal tab
   - Container should be removed immediately
   - Verify: `docker ps -a --filter "name=web-shell-session"`

2. **Close Browser Window**: ✅
   - Close entire browser window
   - Container should be removed immediately
   - Verify: `docker ps -a --filter "name=web-shell-session"`

3. **Switch Browser Tabs**: ✅
   - Switch to different tab for 5 minutes
   - Switch back
   - Terminal should still be active (ping sent on return)

4. **Idle Timeout**: ✅
   - Leave terminal open but inactive for > IDLE_TIMEOUT_MINUTES
   - Session should be cleaned up after next 5-min cleanup check

5. **Network Error**: ✅
   - Simulate network disconnection
   - Backend should cleanup session on error
   - Frontend should show error message

## Benefits

- **Resource Efficiency**: Containers automatically removed when not needed
- **User Experience**: Seamless cleanup without manual intervention
- **Cost Optimization**: No orphaned containers consuming resources
- **Scalability**: Session limits prevent resource exhaustion
- **Reliability**: Multiple cleanup triggers ensure no leaks

## Monitoring

Check cleanup is working:
```bash
# Monitor container creation/deletion
watch -n 2 'docker ps -a --filter "name=web-shell-session" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"'

# Monitor backend logs for cleanup events
docker logs -f web-shell-backend-dev | grep -i "terminated\|cleanup"
```
