# Minimal Environment Dockerfile
# Bare essentials - This is the BASE image for all environments

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
# STAGE 2: Minimal Production (BASE LAYER)
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

RUN chown -R node:node /home/node

USER node

EXPOSE 3366

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
