# Backend Dockerfile - Multi-Environment Support
# This Dockerfile supports building different environments via build args
#
# Usage:
#   docker build --build-arg ENVIRONMENT=minimal -t web-shell-backend:minimal .
#   docker build --build-arg ENVIRONMENT=default -t web-shell-backend:default .
#   docker build -t web-shell-backend .  (defaults to 'default')

ARG ENVIRONMENT=default

# ============================================
# STAGE 1: Builder (SHARED by all environments)
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================
# STAGE 2: Minimal Environment (BASE LAYER)
# ============================================
FROM node:20-alpine AS minimal

# Install only essential packages
RUN apk add --no-cache \
    python3 make g++ \
    zsh bash curl git vim \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV SHELL=/bin/zsh
ENV ENVIRONMENT=minimal

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy minimal shell configurations
COPY environments/minimal/.zshrc /home/node/.zshrc
COPY environments/minimal/.bashrc /home/node/.bashrc

# Create workspace directory and set ownership
RUN mkdir -p /workspace && chown -R node:node /home/node /workspace

USER node

EXPOSE 3366

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]

# ============================================
# STAGE 3: Default Environment (EXTENDS minimal)
# ============================================
FROM minimal AS default

# Switch to root to install additional packages
USER root

# Install additional packages on top of minimal base
RUN apk add --no-cache \
    zsh-autosuggestions zsh-syntax-highlighting \
    bash-completion \
    wget nano \
    htop ncdu tree \
    less jq ncurses \
    && rm -rf /var/cache/apk/*

# Update environment marker
ENV ENVIRONMENT=default

# Copy enhanced shell configurations (overwrites minimal configs)
COPY environments/default/.zshrc /home/node/.zshrc
COPY environments/default/.bashrc /home/node/.bashrc

# Ensure workspace ownership (inherited from minimal but ensure it's correct)
RUN chown -R node:node /home/node /workspace

# Switch back to non-root user
USER node

# All other settings inherited from minimal:
# - EXPOSE 3366
# - HEALTHCHECK
# - CMD ["node", "dist/server.js"]

# ============================================
# STAGE 4: Development Environment
# ============================================
FROM node:20-alpine AS dev

# Build arguments for cache invalidation
ARG ENV_CONFIG_VERSION=1
ARG SOURCE_VERSION=1

# Install system dependencies for development
RUN apk add --no-cache \
    python3 make g++ \
    zsh bash \
    git curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for tsx)
RUN npm install

# Copy source code (cache invalidation)
ARG SOURCE_VERSION
RUN echo "Source version: ${SOURCE_VERSION}"
COPY . .

# Copy shell configurations (cache invalidation)
ARG ENV_CONFIG_VERSION
RUN echo "Environment config version: ${ENV_CONFIG_VERSION}"
COPY environments/default/.zshrc /root/.zshrc
COPY environments/default/.bashrc /root/.bashrc

EXPOSE 3366

# Start development server with tsx watch
CMD ["npm", "run", "dev"]

# ============================================
# FINAL: Select environment based on build arg
# ============================================
FROM ${ENVIRONMENT} AS final
