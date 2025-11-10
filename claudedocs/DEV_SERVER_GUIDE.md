# Web Shell - Development Server Guide

## ✅ Recommended: Use Docker Compose (Full Stack)

Your project has a complete Docker Compose setup that runs both frontend and backend together with hot-reload support.

### Quick Start

```bash
# From project root (/home/corey/Projects/web-shell)
./start.sh
```

This script will:
1. ✅ Run TypeScript type checks (preflight.sh)
2. ✅ Start Docker Proxy (secure Docker socket access)
3. ✅ Start Backend (Node.js API on port 3366)
4. ✅ Start Frontend (Vite dev server on port 5173)
5. ✅ Set up networking between services

**Access the app at:** http://localhost:5173

### Alternative: Manual Docker Compose

```bash
# Start all services
docker compose -f docker-compose.dev.yml up

# Or run in background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down

# Or use the stop script
./stop.sh
```

## 🔧 Development Mode Features

### What's Included in docker-compose.dev.yml:

**Frontend (Port 5173):**
- ✅ Vite dev server with hot module reload
- ✅ Volume mounted: `/frontend` → live code changes
- ✅ Node modules cached for fast rebuilds
- ✅ Connected to backend via network

**Backend (Port 3366):**
- ✅ Node.js with nodemon for auto-restart
- ✅ Volume mounted: `/backend` → live code changes
- ✅ Environment variables configured
- ✅ Docker proxy access for terminal sessions

**Docker Proxy:**
- ✅ Secure Docker socket access
- ✅ Limited permissions (no dangerous operations)
- ✅ Health checks enabled

### Environment Variables (Development):
```env
# Backend
NODE_ENV=development
PORT=3366
AUTH_ENABLED=true
DEFAULT_PASSWORD=admin123
CORS_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3366
VITE_WS_URL=ws://localhost:3366
```

## 🏗️ Production Mode

For production deployment:

```bash
# Use production docker-compose
docker compose -f docker-compose.yml up -d

# Frontend will be served as static files via nginx
# Backend runs in production mode
```

## 🚫 NOT Recommended: Standalone Frontend Dev Server

Running `npm run dev` in the frontend directory will start the UI, but:
- ❌ No backend API (authentication will fail)
- ❌ No WebSocket connection (terminal won't work)
- ❌ No Docker proxy (can't create terminal sessions)

**Only use this for:**
- UI component development/testing
- CSS/styling work
- Checking build errors

## 📱 Testing on Mobile

### Desktop Browser (Same Machine):
```
http://localhost:5173
```

### Mobile Device (Same Network):

1. Find your computer's IP address:
```bash
# Linux/Mac
hostname -I

# Or
ip addr show | grep "inet "
```

2. Update CORS in docker-compose.dev.yml:
```yaml
environment:
  - CORS_ORIGINS=http://localhost:5173,http://YOUR_IP:5173
```

3. Access from mobile:
```
http://YOUR_IP:5173
```

Example: `http://192.168.1.100:5173`

## 🐛 Troubleshooting

### Port Already in Use:
```bash
# Check what's using port 5173
lsof -i :5173

# Or port 3366
lsof -i :3366

# Kill the process or stop docker compose
./stop.sh
```

### Docker Not Running:
```bash
# Start Docker daemon
sudo systemctl start docker

# Or on Mac/Windows, start Docker Desktop
```

### Build Errors:
```bash
# Rebuild containers
docker compose -f docker-compose.dev.yml up --build

# Clean rebuild
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build
```

### Hot Reload Not Working:
```bash
# Make sure volumes are mounted correctly
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up
```

## 📊 Monitoring

### View All Logs:
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### View Specific Service:
```bash
# Frontend only
docker compose -f docker-compose.dev.yml logs -f frontend

# Backend only
docker compose -f docker-compose.dev.yml logs -f backend
```

### Check Service Status:
```bash
docker compose -f docker-compose.dev.yml ps
```

## 🎯 Summary

**For Full Stack Development (Recommended):**
```bash
./start.sh
# Access: http://localhost:5173
```

**For UI-Only Testing:**
```bash
cd frontend
npm run dev
# Access: http://localhost:5173 (limited functionality)
```

**For Production:**
```bash
docker compose up -d
# Access: http://localhost (or your domain)
```
