# Default Environment Dockerfile
# Full-featured environment with zsh as default

FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production - DEFAULT
FROM node:20-alpine

# Install full package set
RUN apk add --no-cache \
    python3 make g++ \
    zsh zsh-autosuggestions zsh-syntax-highlighting \
    bash bash-completion \
    git curl wget \
    vim nano \
    htop ncdu tree \
    less jq ncurses \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV SHELL=/bin/zsh

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Copy shell configurations
COPY environments/default/.zshrc /home/node/.zshrc
COPY environments/default/.bashrc /home/node/.bashrc

RUN chown node:node /home/node/.zshrc /home/node/.bashrc

USER node

EXPOSE 3366

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
