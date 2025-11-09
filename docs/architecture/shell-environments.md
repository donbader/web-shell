# Modular Shell Environments

Simple, Dockerfile-based environment system with zsh as default shell.

## Structure

```
backend/
├── Dockerfile → environments/default/Dockerfile (symlink)
└── environments/
    ├── minimal/
    │   ├── Dockerfile          # Minimal environment
    │   ├── .zshrc             # Zsh config
    │   └── .bashrc            # Bash config
    └── default/
        ├── Dockerfile          # Default environment (recommended)
        ├── .zshrc             # Zsh config
        └── .bashrc            # Bash config
```

## Environments

### `default` (recommended)
- **Packages**: Full development toolset
- **Shell**: Zsh with plugins (auto-suggestions, syntax highlighting)
- **Features**: Git integration, enhanced completion, 10k history
- **Size**: ~200MB

### `minimal`
- **Packages**: Essential tools only
- **Shell**: Basic zsh/bash
- **Features**: Simple prompt, 1k history, basic aliases
- **Size**: ~150MB

## Usage

### Build with default (recommended)
```bash
docker build -t web-shell-backend .
```

### Build with minimal
```bash
docker build -f environments/minimal/Dockerfile -t web-shell-backend .
```

### Access shell
```bash
# Zsh (default)
docker exec -it <container> zsh

# Bash
docker exec -it <container> bash
```

## Creating Custom Environment

1. **Create directory**
```bash
mkdir -p backend/environments/myenv
```

2. **Create Dockerfile** (`environments/myenv/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

# Install your packages
RUN apk add --no-cache \
    python3 make g++ \
    zsh bash git vim \
    your-package-here \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV SHELL=/bin/zsh

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Copy configs
COPY environments/myenv/.zshrc /home/node/.zshrc
COPY environments/myenv/.bashrc /home/node/.bashrc
RUN chown node:node /home/node/.zshrc /home/node/.bashrc

USER node
EXPOSE 3366
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3366/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/server.js"]
```

3. **Create shell configs**
- Copy from `minimal/` or `default/` as starting point
- Customize aliases, prompt, etc.

4. **Build**
```bash
docker build -f environments/myenv/Dockerfile -t web-shell-backend .
```

## Tips

- 💡 Default environment uses **zsh** as primary shell
- 💡 Use `default` for development, `minimal` for production
- 💡 Each environment = 1 Dockerfile + shell config files
- 💡 Edit `.zshrc` and `.bashrc` to customize shell behavior
- 💡 Add packages in Dockerfile `RUN apk add` section

## Troubleshooting

**Build fails?**
```bash
# Check package exists
docker run --rm alpine:latest apk search <package>
```

**Shell config issues?**
```bash
# Test zsh syntax
zsh -n environments/default/.zshrc

# Test bash syntax
bash -n environments/default/.bashrc
```

**Check active shell:**
```bash
docker exec <container> echo $SHELL
```
