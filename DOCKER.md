# Docker Setup for Web Shell

## Overview

Web Shell runs in Docker containers with **multi-environment support**:
- **Minimal**: Lightweight, fast startup (~200MB, < 1s boot)
- **Default**: Full-featured development environment (~240MB, < 2s boot)

Both environments use **multi-stage builds** where default extends minimal for efficient layer sharing.

## Quick Start

### Development Mode

```bash
# Start services (builds if needed)
./start.sh

# Stop services
./stop.sh
```

### Environment Selection

Choose your backend environment via `.env` file or environment variable:

```bash
# Minimal environment (fastest, smallest)
BACKEND_ENVIRONMENT=minimal docker compose up

# Default environment (full-featured)
BACKEND_ENVIRONMENT=default docker compose up
# Or just: docker compose up (default is the default)
```

See [Environment Implementation Guide](docs/environment-implementation.md) for details.

### Manual Docker Compose

```bash
# Build images
docker compose -f docker-compose.dev.yml build

# Start services
docker compose -f docker-compose.dev.yml up

# Start in detached mode
docker compose -f docker-compose.dev.yml up -d

# Stop services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Rebuild and restart
docker compose -f docker-compose.dev.yml up --build
```

## Architecture

### Development (`docker-compose.dev.yml`)

- **Backend**: Node.js with hot reload, mounted source code
  - Port: 3366
  - Volume: `./backend:/app` (live code updates)

- **Frontend**: Vite dev server with HMR
  - Port: 5173
  - Volume: `./frontend:/app` (live code updates)

### Production (`docker-compose.yml`)

- **Backend**: Optimized Node.js container
  - Port: 3366
  - Health checks enabled
  - Resource limits configured

- **Frontend**: Nginx serving static build
  - Port: 3377 (80 in container)
  - Health checks enabled
  - Optimized static asset serving

## Services

### Backend

**Dockerfile**: `backend/Dockerfile` (multi-environment support)
- Base: `node:20-alpine`
- Environments: minimal, default
- Features: zsh/bash support, PTY management

**Development**:
- Hot reload via `npm run dev`
- Source code mounted as volume
- Debug-friendly settings

**Environment Variables**:
```env
NODE_ENV=development
PORT=3366
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:5173
MAX_SESSIONS_PER_USER=10
IDLE_TIMEOUT_MINUTES=60
```

### Frontend

**Dockerfile.dev**: Development server
- Vite dev server with HMR
- Port 5173 exposed
- Source mounted for live updates

**Dockerfile**: Production build
- Multi-stage build (builder + nginx)
- Optimized static assets
- Nginx configuration included

**Environment Variables**:
```env
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
```

## Networking

All services run on a bridge network: `web-shell-network`

- Backend ↔ Frontend communication
- Port mapping to host:
  - Development: 3366 (backend), 5173 (frontend)
  - Production: 3366 (backend), 3377 (frontend)

## Volumes

### Development
- Source code mounted for live updates
- `node_modules` excluded (container-specific)

### Production
- `backend-data`: Persistent session data storage

## Common Tasks

### View Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend

# Last N lines
docker compose -f docker-compose.dev.yml logs --tail=100 backend
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.dev.yml restart

# Restart specific service
docker compose -f docker-compose.dev.yml restart backend
```

### Rebuild Images

```bash
# Rebuild all
docker compose -f docker-compose.dev.yml build

# Rebuild specific service
docker compose -f docker-compose.dev.yml build backend

# No cache rebuild
docker compose -f docker-compose.dev.yml build --no-cache
```

### Shell Access

```bash
# Backend container
docker compose -f docker-compose.dev.yml exec backend sh

# Frontend container
docker compose -f docker-compose.dev.yml exec frontend sh
```

### Clean Up

```bash
# Stop and remove containers
docker compose -f docker-compose.dev.yml down

# Also remove volumes
docker compose -f docker-compose.dev.yml down -v

# Remove images
docker compose -f docker-compose.dev.yml down --rmi all
```

## Troubleshooting

### Port Already in Use

If ports 3366 or 5173 are already in use:

```bash
# Stop any running containers
./stop.sh

# Or manually
docker compose -f docker-compose.dev.yml down

# Find and kill process on port
lsof -ti :3366 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

### Container Won't Start

Check logs for errors:
```bash
docker compose -f docker-compose.dev.yml logs backend
docker compose -f docker-compose.dev.yml logs frontend
```

Rebuild without cache:
```bash
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up
```

### Changes Not Reflecting

Development mode uses volume mounts, so changes should reflect immediately. If not:

1. Check that volumes are mounted correctly:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. Restart the service:
   ```bash
   docker compose -f docker-compose.dev.yml restart backend
   ```

3. Rebuild if needed:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

### Docker Not Running

```bash
# Check Docker status
docker info

# Start Docker service (Linux)
sudo systemctl start docker

# Start Docker Desktop (Mac/Windows)
# Open Docker Desktop application
```

## Production Deployment

### Build Production Images

```bash
docker compose build
```

### Run Production

```bash
docker compose up -d
```

### Production Environment Variables

Create `.env` file in project root:

```env
# Backend
NODE_ENV=production
PORT=3366
AUTH_ENABLED=true
CORS_ORIGINS=https://yourdomain.com
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30

# Frontend
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com
```

## Tips

- **Development**: Always use `docker-compose.dev.yml` for live updates
- **Production**: Use `docker-compose.yml` for optimized builds
- **Logs**: Always check logs first when debugging
- **Clean builds**: Use `--no-cache` if experiencing weird issues
- **Resources**: Adjust resource limits in docker-compose files as needed

## Files

- `docker-compose.dev.yml` - Development configuration
- `docker-compose.yml` - Production configuration
- `backend/Dockerfile` - Backend multi-stage build
- `frontend/Dockerfile.dev` - Frontend development image
- `frontend/Dockerfile` - Frontend production image
- `start.sh` - Development startup script
- `stop.sh` - Stop script
