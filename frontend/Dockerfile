# syntax=docker/dockerfile:1
# Multi-stage build for Web Shell Frontend
# Optimized for caching and smaller production image

# ============================================
# STAGE 1: Dependencies (cached layer)
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only dependency files for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline && \
    npm cache clean --force

# ============================================
# STAGE 2: Builder (Vite build)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Build production bundle with environment variables
ARG VITE_BASE_PATH
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_AUTH_ENABLED
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_AUTH_ENABLED=${VITE_AUTH_ENABLED}

RUN npm run build

# ============================================
# STAGE 3: Production (nginx)
# ============================================
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget && \
    rm -rf /var/cache/apk/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user directories
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Run as non-root user
USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
