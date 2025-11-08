# Docker Deployment Guide

## Overview

Web Shell supports two deployment modes:
1. **Standalone**: Local development or standalone Docker deployment
2. **Main Router Integration**: Production deployment via Traefik reverse proxy

## Architecture

### Standalone Mode
```
Client → Backend (3366) ← WebSocket
    ↓
Frontend (3377) → Static Files
```

### Main Router Mode
```
Client → Traefik (8888)
    ↓
    ├─ /corey-private-router/web-shell → Frontend (nginx:80)
    │  Static files (HTML, JS, CSS)
    │
    └─ /corey-private-router/web-shell-api → Backend (node:3366)
       API endpoints + WebSocket connections
```

## Standalone Deployment

### Quick Start

```bash
cd /home/corey/Projects/web-shell

# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Access

- **Frontend**: http://localhost:3377
- **Backend Health**: http://localhost:3366/health

### Configuration

Environment variables (`.env.docker`):
```bash
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:3377
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
```

## Main Router Integration

### Prerequisites

- Main router must be running: `cd ../main-router && docker compose up -d`
- Traefik reverse proxy on port 8888

### Integration Steps

**⚠️ Note**: Web-shell services are already configured in `../main-router/docker-compose.yml`

1. **Deploy Using Script** (Recommended)

   ```bash
   cd /home/corey/Projects/web-shell
   ./deploy-to-main-router.sh
   ```

   This script will:
   - Build both web-shell images
   - Deploy to main-router
   - Check service health
   - Display access URLs

2. **Manual Deployment**

   ```bash
   cd ../main-router
   docker compose up -d --build web-shell-backend web-shell-frontend
   ```

3. **Access Application**

   http://localhost:8888/corey-private-router/web-shell

### Routing Configuration

**Frontend Path**: `/corey-private-router/web-shell`
- Serves static files via nginx
- Priority: 1 (lower than backend)

**Backend Path**: `/corey-private-router/web-shell-api`
- Handles API requests and WebSocket connections
- Priority: default (higher than frontend)

### Environment Variables (Main Router)

Build args in `docker-compose.yml`:
```yaml
web-shell-frontend:
  build:
    args:
      - VITE_BASE_PATH=/corey-private-router/web-shell/
      - VITE_API_URL=http://localhost:8888/corey-private-router/web-shell-api
      - VITE_WS_URL=ws://localhost:8888/corey-private-router/web-shell-api
```

Runtime environment for backend:
```yaml
web-shell-backend:
  environment:
    - AUTH_ENABLED=false
    - CORS_ORIGINS=*
    - MAX_SESSIONS_PER_USER=5
    - IDLE_TIMEOUT_MINUTES=30
```

## Docker Images

### Backend (`web-shell-backend:latest`)

**Base**: `node:20-alpine`
**Multi-stage build**:
1. Builder stage: Compile TypeScript + native modules (node-pty)
2. Production stage: Minimal runtime with compiled code

**Size**: ~200MB (includes build tools for node-pty)
**Port**: 3366
**Health Check**: `/health` endpoint

### Frontend (`web-shell-frontend:latest`)

**Base**: `node:20-alpine` → `nginx:alpine`
**Multi-stage build**:
1. Builder stage: Vite production build
2. Production stage: nginx serving static files

**Size**: ~25MB
**Port**: 80
**Health Check**: `/health` endpoint

## Resource Limits

### Backend
```yaml
limits:
  cpus: '1.0'
  memory: 512M
reservations:
  cpus: '0.5'
  memory: 256M
```

### Frontend
```yaml
limits:
  cpus: '0.25'
  memory: 128M
reservations:
  cpus: '0.1'
  memory: 64M
```

## Volumes

### Standalone Mode
```yaml
volumes:
  backend-data:
    driver: local
```

### Main Router Mode
```yaml
volumes:
  web-shell-backend-data:
    driver: local
```

**Data Path**: `/app/data` in backend container
**Purpose**: Session persistence and application data

## Management Commands

### View Logs

```bash
# Standalone
docker compose logs -f

# Main router
cd ../main-router
docker compose logs -f web-shell-backend web-shell-frontend
```

### Restart Services

```bash
# Standalone
docker compose restart

# Main router - specific services
cd ../main-router
docker compose restart web-shell-backend web-shell-frontend
```

### Rebuild After Code Changes

```bash
# Standalone
docker compose up -d --build

# Main router
cd ../main-router
docker compose up -d --build web-shell-backend web-shell-frontend
```

### Stop Services

```bash
# Standalone
docker compose down

# Main router - keep other services running
cd ../main-router
docker compose stop web-shell-backend web-shell-frontend
```

### Remove Volumes (Data Loss!)

```bash
# Standalone
docker compose down -v

# Main router
cd ../main-router
docker volume rm main-router_web-shell-backend-data
```

## Health Checks

### Backend Health Check
```bash
# Standalone
curl http://localhost:3366/health

# Main router
docker exec web-shell-backend node -e "require('http').get('http://localhost:3366/health', (r) => {console.log(r.statusCode)})"
```

### Frontend Health Check
```bash
# Standalone
curl http://localhost:3377/health

# Main router
docker exec web-shell-frontend wget -qO- http://localhost/health
```

## Troubleshooting

### Build Failures

**Issue**: node-pty compilation fails
```bash
# Ensure build dependencies are installed (already in Dockerfile)
RUN apk add --no-cache python3 make g++
```

**Issue**: TypeScript build errors
```bash
# Verify tsconfig.json is not in .dockerignore
# Check backend/.dockerignore and frontend/.dockerignore
```

### Runtime Issues

**Issue**: Backend can't start
```bash
# Check logs
docker compose logs backend

# Verify health check
docker compose ps
```

**Issue**: Frontend can't connect to backend
```bash
# Verify environment variables
docker inspect web-shell-frontend | grep VITE

# Check backend is healthy
docker compose ps backend
```

**Issue**: WebSocket connection fails
```bash
# Verify CORS settings
docker exec web-shell-backend env | grep CORS

# Check WebSocket upgrade headers in Traefik dashboard
http://localhost:8887/dashboard/
```

### Main Router Issues

**Issue**: 404 Not Found
```bash
# Verify Traefik labels
docker inspect web-shell-frontend | grep traefik

# Check Traefik dashboard
http://localhost:8887/dashboard/

# Ensure main-router-network exists
docker network ls | grep main-router
```

**Issue**: Path routing not working
```bash
# Verify base path configuration
docker exec web-shell-frontend cat /usr/share/nginx/html/index.html | grep base

# Check StripPrefix middleware
docker logs main-router | grep web-shell
```

## Security Considerations

### Production Checklist

- [ ] Enable authentication (`AUTH_ENABLED=true`)
- [ ] Configure OAuth (Phase 5)
- [ ] Restrict CORS origins
- [ ] Set resource limits appropriately
- [ ] Use secrets management for sensitive data
- [ ] Enable HTTPS at Traefik level (handled by main-router)
- [ ] Regular security updates for base images
- [ ] Monitor resource usage and logs

### Current Dev Mode Settings

⚠️ **Not production-ready** - Authentication disabled
- `AUTH_ENABLED=false`
- `CORS_ORIGINS=*`
- Debug logging enabled

## Performance Optimization

### Build Cache Optimization

Dependencies are installed before copying source code to maximize Docker layer caching:
```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

### Multi-stage Builds

Both Dockerfiles use multi-stage builds to minimize production image size:
- Backend: ~200MB (includes runtime dependencies for node-pty)
- Frontend: ~25MB (nginx + static files only)

### Resource Tuning

Adjust resource limits based on usage:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase for high load
      memory: 1024M
```

## Monitoring

### Health Check Status

```bash
# Check all health statuses
docker compose ps

# Watch health in real-time
watch -n 5 'docker compose ps'
```

### Resource Usage

```bash
# View resource consumption
docker stats web-shell-backend web-shell-frontend

# Continuous monitoring
docker stats --no-stream
```

### Logs Analysis

```bash
# Follow logs with timestamps
docker compose logs -f --timestamps

# Filter by service
docker compose logs -f backend

# Search logs
docker compose logs | grep ERROR
```

## Next Steps

- **Phase 5**: Google OAuth Integration
- **Production**: Enable authentication and security hardening
- **Monitoring**: Add Prometheus/Grafana for metrics
- **Backup**: Implement volume backup strategy
