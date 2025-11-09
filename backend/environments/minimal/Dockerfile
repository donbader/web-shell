# Minimal Environment Dockerfile
# Bare essentials for smallest image

FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production - MINIMAL
FROM node:20-alpine

# Install only essential packages
RUN apk add --no-cache \
    python3 make g++ \
    zsh bash curl git vim \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV SHELL=/bin/zsh

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Copy shell configurations
COPY environments/minimal/.zshrc /home/node/.zshrc
COPY environments/minimal/.bashrc /home/node/.bashrc

RUN chown node:node /home/node/.zshrc /home/node/.bashrc

USER node

EXPOSE 3366

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
