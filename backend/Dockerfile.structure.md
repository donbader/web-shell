# Dockerfile Structure Plan

## Architecture: Single Multi-Stage Dockerfile

### File: backend/Dockerfile

Stages:
1. **builder** - Compiles TypeScript (shared by all)
2. **minimal** - Lightweight terminal (production)
3. **default** - Full-featured terminal (production, extends minimal)
4. **dev** - Development backend with hot reload

### Usage:
- docker-compose.dev.yml → target: dev
- start.sh → builds minimal and default targets
- Production → target: minimal or default

### Benefits:
✓ Single source of truth
✓ Shared base layers (caching efficiency)
✓ Standard Docker convention
✓ Easy to understand and maintain
