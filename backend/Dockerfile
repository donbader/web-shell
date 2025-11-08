# Multi-stage build for Web Shell Backend
# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies for node-pty (native module compilation)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Install runtime dependencies and useful shell tools
RUN apk add --no-cache \
    python3 make g++ \
    zsh zsh-autosuggestions zsh-syntax-highlighting \
    bash bash-completion \
    git \
    curl wget \
    vim nano \
    htop ncdu \
    ncurses \
    tree \
    less \
    grep \
    sed \
    tar \
    jq \
    && rm -rf /var/cache/apk/*

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy shell configuration files
COPY .zshrc.docker /home/node/.zshrc
COPY .bashrc.docker /home/node/.bashrc

# Set up shell environment for node user
RUN chown node:node /home/node/.zshrc /home/node/.bashrc && \
    chmod 644 /home/node/.zshrc /home/node/.bashrc

# Set default shell to zsh for node user
ENV SHELL=/bin/zsh

# Run as non-root user
USER node

# Expose WebSocket + HTTP port
EXPOSE 3366

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
