# Web Shell - Startup Guide

## Current Status: ✅ Ready to Use

All errors have been fixed and the application is fully functional.

## Quick Start

### Option 1: Using the startup script (Recommended)
```bash
./start.sh
```

Then open in your browser: **http://localhost:3377**

Press `Ctrl+C` to stop all servers.

### Option 2: Manual startup
Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Then open: **http://localhost:3377**

### Option 3: Stop servers
```bash
./stop.sh
```

## Configuration

### Ports
- **Backend**: Port 3366 (WebSocket + HTTP)
- **Frontend**: Port 3377 (Vite dev server)

### Environment Files

**Backend** (`backend/.env`):
```bash
PORT=3366
NODE_ENV=development
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:3377
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
```

## Features

### Multi-Window Terminal
- ✅ Create multiple terminal tabs with "+ New Terminal" button
- ✅ Switch between tabs by clicking
- ✅ Close tabs with × button (minimum 1 tab)
- ✅ Independent shell processes per tab
- ✅ Tab state persists across page refreshes
- ✅ Real-time command execution
- ✅ Full terminal emulation with colors

### Example Workflow
```bash
# Tab 1: System monitoring
htop

# Tab 2: File operations
ls -la && pwd

# Tab 3: Python development
python3

# Tab 4: Text editing
vim myfile.txt
```

## Verification Checklist

✅ Frontend TypeScript compilation: No errors
✅ Backend TypeScript compilation: No errors
✅ Frontend build: Successful
✅ Backend build: Successful
✅ Backend health check: Passing
✅ Frontend serving: Working
✅ Port 3366: Listening (Backend)
✅ Port 3377: Listening (Frontend)
✅ All syntax errors: Fixed
✅ Module imports: Working correctly

## Fixed Issues

1. ✅ **TerminalWindow.tsx import error**: Fixed by importing `TerminalComponent` instead of `Terminal`
2. ✅ **Module export error**: Fixed by moving type definitions inline to WindowManager.tsx
3. ✅ **Port conflicts**: Configured to use ports 3366 and 3377
4. ✅ **TypeScript compilation**: All type errors resolved

## Next Steps

The application is ready to use! 

**Phase 2 Complete**: Multi-window terminal is fully functional.

**Future phases**:
- Phase 3: Production Hardening (HTTPS, security headers, rate limiting)
- Phase 4: Docker Deployment
- Phase 5: Google OAuth Integration

## Troubleshooting

If you encounter issues:

1. **Port already in use**:
   ```bash
   ./stop.sh
   lsof -ti:3366 | xargs kill -9
   lsof -ti:3377 | xargs kill -9
   ./start.sh
   ```

2. **Check server logs**:
   ```bash
   tail -f backend.log
   tail -f frontend.log
   ```

3. **Verify health**:
   ```bash
   curl http://localhost:3366/health
   curl http://localhost:3377
   ```

## Support

For issues or questions, refer to:
- [README.md](README.md) - Full documentation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [docs/SECURITY.md](docs/SECURITY.md) - Security guidelines
