# Web Shell - Browser-based Terminal Application

A secure, browser-based terminal application with Google OAuth authentication and multi-window support.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with Google accounts
- 💻 **Real-time Shell Execution** - Execute shell commands directly in the browser
- 📑 **Multi-Window Support** - Multiple concurrent terminal sessions with tab interface
- 🐳 **Fully Dockerized** - Complete containerization for easy deployment
- 🔒 **Security-Focused** - Process isolation, resource limits, HTTPS/WSS encryption

## Architecture

**Frontend**: React 18 + TypeScript + Vite + xterm.js
**Backend**: Node.js + Express + TypeScript + WebSocket + node-pty
**Auth**: Google OAuth 2.0 + JWT session management
**Deployment**: Docker + docker-compose

## Project Status

✅ **Phase 1-2 Complete!** Multi-window terminal working!
✅ **Phase 4 Complete!** Docker deployment ready!

### Implementation Phases

- [x] **Phase 1**: Foundation Setup ✅
- [x] **Phase 2**: Multi-Window Support ✅ (OAuth moved to Phase 5)
- [ ] **Phase 3**: Production Hardening (Deferred - TLS handled at nginx/Traefik layer)
- [x] **Phase 4**: Docker Deployment ✅
- [ ] **Phase 5**: Google OAuth Integration (Production auth)

## Prerequisites

- Node.js 20 LTS
- npm (comes with Node.js)

## Quick Start

### Development Mode (Local)

**Option 1: Simple Startup Script** (Recommended)
```bash
./start.sh
```
Then open: **http://localhost:3377**

Press `Ctrl+C` to stop all servers.

**Option 2: Manual (Two Terminals)**

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

**Option 3: Stop Running Servers**
```bash
./stop.sh
```

### Docker Deployment

**Standalone Mode:**
```bash
docker compose up -d
```
Access: **http://localhost:3377**

**Main Router Integration:**
```bash
# Option 1: Use deployment script (recommended)
./deploy-to-main-router.sh

# Option 2: Manual deployment
cd ../main-router
docker compose up -d --build web-shell-backend web-shell-frontend
```
Access: **http://localhost:8888/corey-private-router/web-shell**

See [Docker Deployment Guide](docs/DOCKER.md) for complete documentation.

## Using the Terminal

### Multi-Window Features

Once the application is running at **http://localhost:3377**, you can:

1. **Create New Terminal**: Click the "+ New Terminal" button
2. **Switch Tabs**: Click on any tab to make it active
3. **Close Terminal**: Click the × button on any tab (except the last one)
4. **Run Commands**: Type commands in the active terminal

### Example Multi-Window Workflow

```bash
# Tab 1: System monitoring
htop

# Tab 2: Code editing
vim myfile.txt

# Tab 3: Python development
python3

# Tab 4: File operations
ls -la && pwd

# Tab 5: Live logs
tail -f /var/log/syslog
```

All terminals run independently and simultaneously!

### Current Features

- ✅ Real-time command execution
- ✅ Multiple concurrent terminal sessions
- ✅ Independent shell processes per tab
- ✅ Tab state persistence (restored on page refresh)
- ✅ Full terminal emulation (colors, interactive programs)
- ✅ Responsive terminal sizing
- ✅ Clickable URLs in terminal output
- ⚠️ **Dev Mode**: No authentication (development only)

## Development

### Available Scripts

**Backend:**
```bash
cd backend
npm run dev         # Start dev server with hot reload
npm run build       # Compile TypeScript to JavaScript
npm run start       # Run compiled code
npm run type-check  # Check TypeScript types
```

**Frontend:**
```bash
cd frontend
npm run dev    # Start dev server with hot reload
npm run build  # Build for production
npm run preview # Preview production build
```

### Environment Variables

**Backend** (`backend/.env`):
```bash
PORT=3366
NODE_ENV=development
AUTH_ENABLED=false                    # true for production with OAuth
CORS_ORIGINS=http://localhost:3377
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
```

## Security

This application provides shell access through a web browser. Please review [docs/SECURITY.md](docs/SECURITY.md) for critical security guidelines before deployment.

**⚠️ Never deploy without**:
- Google OAuth authentication enabled
- HTTPS/WSS in production
- Resource limits configured
- Security headers set

## Documentation

- [Docker Deployment Guide](docs/DOCKER.md)
- [Main Router Integration](docs/main-router-integration.yml)
- [Security Requirements](docs/SECURITY.md) (Coming soon)
- [Architecture Design](docs/ARCHITECTURE.md) (Coming soon)
- [API Documentation](docs/API.md) (Coming soon)

## License

[License TBD]

## Contributing

[Contributing guidelines TBD]
