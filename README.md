# Web Shell - Browser-based Terminal Application

A secure, browser-based terminal application with multi-window support and customizable shell environments.

## Features

- 💻 **Real-time Shell Execution** - Execute shell commands directly in the browser
- 📑 **Multi-Window Support** - Multiple concurrent terminal sessions with tab interface
- 🐚 **Environment Selection** - Choose between zsh/bash and default/minimal environments
- 🐳 **Fully Dockerized** - Complete containerization for consistent development and deployment
- 🔒 **Security-Focused** - Process isolation, resource limits, production-ready architecture

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Mode

```bash
# Start everything with pre-flight checks
./start.sh

# Stop all services
./stop.sh
# or press Ctrl+C
```

**Access**: http://localhost:5173

The start script automatically:
- ✅ Runs TypeScript type checking
- ✅ Builds Docker images
- ✅ Starts both frontend and backend
- ✅ Shows live logs

### Production Deployment

```bash
docker compose up -d
```

**Access**: http://localhost:3377

See [Docker Deployment Guide](docs/deployment/docker-deployment.md) for detailed Docker documentation.

## Using the Terminal

1. **Create New Terminal**: Click "+ New Terminal"
2. **Select Environment**: Choose your shell (zsh/bash) and environment (default/minimal)
3. **Switch Tabs**: Click tabs to switch between terminals
4. **Close Terminal**: Click × on any tab
5. **Run Commands**: Type commands in the active terminal

### Shell Environments

| Environment | Shell | Features | Tools |
|-------------|-------|----------|-------|
| **Default** | zsh | Plugins, completion, git | htop, tree, jq, ncdu, etc. |
| **Default** | bash | Completion, history | htop, tree, jq, ncdu, etc. |
| **Minimal** | zsh | Basic features only | Essential tools only |
| **Minimal** | bash | Basic features only | Essential tools only |

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + xterm.js
- **Backend**: Node.js 20 + Express + TypeScript + WebSocket + node-pty
- **Deployment**: Docker + docker-compose (development & production)

## Project Structure

```
web-shell/
├── backend/           # Node.js backend with PTY management
│   ├── src/          # TypeScript source
│   ├── environments/ # Shell environment configurations
│   └── Dockerfile    # Production image
├── frontend/          # React frontend
│   ├── src/          # TypeScript source
│   └── Dockerfile    # Production build
├── start.sh          # Development startup script
├── stop.sh           # Stop script
├── preflight.sh      # Type checking before start
├── docker-compose.dev.yml   # Development
└── docker-compose.yml       # Production
```

## Development

### Type Checking

```bash
# Run pre-flight checks manually
./preflight.sh

# Check backend types only
cd backend && npm run type-check

# Check frontend types only
cd frontend && npm run type-check
```

### Docker Commands

```bash
# Rebuild without cache
docker compose -f docker-compose.dev.yml build --no-cache

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Access container shell
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml exec frontend sh
```

## Documentation

- [Complete Documentation](docs/README.md) - Full documentation index
- [Development Guide](docs/development/DEVELOPMENT.md) - Development guide and best practices
- [Docker Deployment](docs/deployment/docker-deployment.md) - Complete Docker documentation
- [Security Audit](docs/architecture/SECURITY_AUDIT.md) - Security review and findings
- [Quick Reference](docs/user-guide/QUICK_REFERENCE.md) - Common commands and usage
- [Shell Environments](docs/architecture/shell-environments.md) - Shell environment details

## Environment Variables

### Development (.env files)

**Backend** (`backend/.env`):
```bash
PORT=3366
NODE_ENV=development
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
VITE_AUTH_ENABLED=false
```

### Production (docker-compose.yml)

Environment variables are configured in `docker-compose.yml` for production deployment.

## Security

⚠️ **Development Mode**: Authentication is disabled for local development.

**Security Features** (Phase 1-4):
- ✅ **HTTP Security Headers** - Helmet.js protection against XSS, clickjacking, MIME-sniffing
- ✅ **WebSocket Input Validation** - All inputs sanitized with whitelists and size limits
- ✅ **Container Resource Limits** - 512MB RAM, 1.0 CPU, 100 processes per container
- ✅ **Rate Limiting** - 5 login attempts per 15 minutes, brute-force protection
- ✅ **Password Authentication** - bcrypt hashing, JWT tokens, secure sessions
- ✅ **Docker Socket Proxy** - Isolated Docker access with minimal permissions

**For Production**:
- Enable authentication (`AUTH_ENABLED=true`)
- Change default password (`DEFAULT_PASSWORD=your-secure-password`)
- Use HTTPS/WSS
- Configure reverse proxy (nginx/Traefik)
- Review security headers in `PHASE_4_COMPLETION_REPORT.md`
- Consider stricter CSP (remove `'unsafe-inline'`)

## Troubleshooting

### Port Conflicts

```bash
./stop.sh
docker compose -f docker-compose.dev.yml down -v
./start.sh
```

### Type Errors

Type checking runs automatically on start. Fix errors shown in output before continuing.

### Container Issues

```bash
# Clean rebuild
docker compose -f docker-compose.dev.yml build --no-cache
./start.sh
```

See [Development Guide](docs/development/DEVELOPMENT.md) for comprehensive troubleshooting guide.

## License

[License TBD]
