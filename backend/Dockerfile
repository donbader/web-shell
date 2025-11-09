# syntax=docker/dockerfile:1
# Backend Dockerfile - Multi-Environment Support
# Optimized multi-stage build with improved caching and smaller image sizes
#
# Usage:
#   docker build --build-arg ENVIRONMENT=minimal -t web-shell-backend:minimal .
#   docker build --build-arg ENVIRONMENT=default -t web-shell-backend:default .
#   docker build -t web-shell-backend .  (defaults to 'default')

ARG ENVIRONMENT=default

# ============================================
# STAGE 1: Dependencies (cached layer)
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only dependency files for better caching
COPY package*.json ./

# Install build dependencies only for native modules
RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ && \
    npm ci && \
    apk del .build-deps

# ============================================
# STAGE 2: Builder (TypeScript compilation)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source and build
COPY . .
RUN npm run build

# ============================================
# STAGE 3: Runtime Base (production dependencies only)
# ============================================
FROM node:20-alpine AS runtime-base

WORKDIR /app

# Install runtime dependencies for native modules (minimal set)
RUN apk add --no-cache --virtual .runtime-deps \
    python3 make g++ && \
    apk add --no-cache \
    docker-cli \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --prefer-offline && \
    npm cache clean --force && \
    apk del .runtime-deps

# Copy built application
COPY --from=builder /app/dist ./dist

# Create workspace directory
RUN mkdir -p /workspace

# ============================================
# STAGE 4: Minimal Environment
# ============================================
FROM runtime-base AS minimal

# Install essential shell tools
RUN apk add --no-cache \
    zsh bash curl git vim \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV SHELL=/bin/zsh
ENV ENVIRONMENT=minimal

# Copy minimal shell configurations
COPY environments/minimal/.zshrc /home/node/.zshrc
COPY environments/minimal/.bashrc /home/node/.bashrc

# Set ownership
RUN chown -R node:node /home/node /workspace /app

USER node

EXPOSE 3366

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]

# ============================================
# STAGE 5: Default Environment (extends minimal)
# ============================================
FROM minimal AS default

USER root

# Install additional development tools
RUN apk add --no-cache \
    zsh-autosuggestions zsh-syntax-highlighting \
    bash-completion \
    wget nano \
    htop ncdu tree \
    less jq ncurses \
    && rm -rf /var/cache/apk/*

ENV ENVIRONMENT=default

# Copy enhanced shell configurations
COPY environments/default/.zshrc /home/node/.zshrc
COPY environments/default/.bashrc /home/node/.bashrc

RUN chown -R node:node /home/node

USER node

# ============================================
# STAGE 6: Development Environment
# ============================================
FROM node:20-alpine AS dev

# Install development dependencies
RUN apk add --no-cache \
    python3 make g++ \
    docker-cli \
    zsh bash git curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Copy shell configurations for development
COPY environments/default/.zshrc /root/.zshrc
COPY environments/default/.bashrc /root/.bashrc

# Create non-root user for development
RUN addgroup -g 1000 devuser && \
    adduser -D -u 1000 -G devuser devuser && \
    chown -R devuser:devuser /app

USER devuser

EXPOSE 3366

CMD ["npm", "run", "dev"]

# ============================================
# FINAL: Select environment based on build arg
# ============================================
FROM ${ENVIRONMENT} AS final
