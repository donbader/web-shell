# Docker Architecture

## Overview

This project uses a **single multi-stage Dockerfile** with four build targets to support different use cases.

## File Structure

```
backend/
├── Dockerfile              # ← Single source of truth (multi-stage)
├── environments/
│   ├── default/           # Full-featured terminal configs
│   │   ├── .bashrc
│   │   └── .zshrc
│   └── minimal/           # Lightweight terminal configs
│       ├── .bashrc
│       └── .zshrc
├── docker-compose.dev.yml
└── package.json
```

## Build Stages

### 1. `builder`
- **Purpose**: Compile TypeScript to JavaScript
- **Used by**: All other stages
- **Output**: `/app/dist` directory

### 2. `minimal`
- **Purpose**: Lightweight terminal environment
- **Base**: Alpine Linux + Node.js + basic shell tools
- **Size**: ~150MB
- **Tools**: zsh, bash, curl, git, vim
- **Use case**: Terminal containers for users who want minimal footprint

### 3. `default` (extends `minimal`)
- **Purpose**: Full-featured terminal environment
- **Additional tools**: zsh plugins, htop, ncdu, tree, nano, jq
- **Size**: ~320MB
- **Use case**: Terminal containers for users who want a complete experience

### 4. `dev`
- **Purpose**: Development backend with hot reload
- **Features**: tsx watch, all dev dependencies, shell configs
- **Use case**: Running backend in docker-compose during development

## Usage

### Development (docker-compose)
```bash
# Uses target: dev
docker-compose -f docker-compose.dev.yml up
```

### Build Terminal Images
```bash
# Minimal environment
docker build --target minimal -t web-shell-backend:minimal -f backend/Dockerfile ./backend

# Default environment
docker build --target default -t web-shell-backend:default -f backend/Dockerfile ./backend
```

### Start Script
```bash
# Automatically builds all necessary images
./start.sh
```

## How It Works

### Docker-in-Docker Architecture
1. **Backend container** (`dev` stage) runs via docker-compose
2. Backend spawns **terminal containers** (`minimal` or `default` stage)
3. Each terminal session gets its own isolated container
4. **Persistent volumes** (`web-shell-{userId}-{environment}`) preserve user data

### Build Flow
```
┌─────────────────────────────────────┐
│ 1. builder stage                    │
│    Compiles TypeScript              │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┬────────────────┐
      │                 │                │
┌─────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│ 2. minimal │  │ 3. default  │  │ 4. dev      │
│  (extends  │  │ (extends    │  │ (fresh      │
│   builder) │  │  minimal)   │  │  from base) │
└────────────┘  └─────────────┘  └─────────────┘
```

## Cache Invalidation

The build uses git-based smart caching:

```bash
# Environment configs version
ENV_CONFIG_VERSION=$(git log -1 --format="%H" -- environments/**/.{zshrc,bashrc})

# Source code version
SOURCE_VERSION=$(git log -1 --format="%H" -- src/services/ptyManager.ts ...)
```

Docker layers are cached unless these versions change, making rebuilds fast.

## Key Benefits

✅ **Single Source of Truth**: One Dockerfile for all stages
✅ **Shared Base Layers**: Efficient caching across environments
✅ **Standard Convention**: Follows Docker multi-stage best practices
✅ **Easy Maintenance**: All build logic in one place
✅ **Clear Separation**: Different targets for different purposes
