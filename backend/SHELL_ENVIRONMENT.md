# Docker Shell Environment

The web-shell Docker containers include an enhanced shell environment that provides a comfortable development and debugging experience.

## Features

### Shell Configuration
- **Primary Shell**: Zsh with enhanced features
- **Fallback Shell**: Bash with similar configuration
- Both shells include:
  - Command history (10,000+ entries)
  - Auto-completion
  - Syntax highlighting (zsh)
  - Auto-suggestions (zsh)
  - Command correction
  - Enhanced directory navigation

### Installed Tools

#### Development Tools
- `git` - Version control
- `vim`, `nano` - Text editors
- `curl`, `wget` - HTTP clients
- `jq` - JSON processor

#### System Utilities
- `htop` - Interactive process viewer
- `ncdu` - NCurses disk usage analyzer
- `tree` - Directory tree viewer
- `less` - File pager
- Standard Unix tools: `grep`, `sed`, `tar`, `ps`, `df`, `du`

### Aliases

#### Navigation
```bash
..      # cd ..
...     # cd ../..
....    # cd ../../..
.....   # cd ../../../..
-       # cd - (previous directory)
```

#### File Listing
```bash
ls      # Colorized ls
ll      # Detailed list (ls -lh)
la      # All files including hidden (ls -lAh)
l       # Compact format (ls -CF)
```

#### Common Shortcuts
```bash
h       # history
c       # clear
reload  # Source shell config
grep    # Colorized grep
psa     # ps aux
df      # Human-readable disk free (df -h)
du      # Human-readable disk usage (du -h)
```

### Shell Prompt

The prompt displays:
- Username and hostname
- Current working directory
- Colored for better visibility

Format: `user@hostname:path$`

### Environment Variables

```bash
TERM=xterm-256color      # Color terminal support
EDITOR=vim               # Default editor
VISUAL=vim               # Visual editor
SHELL=/bin/zsh          # Default shell
NODE_ENV=production      # Node environment
```

## Usage

### Accessing the Shell

**Option 1: Interactive shell**
```bash
docker-compose exec backend zsh
# or
docker-compose exec backend bash
```

**Option 2: Single command**
```bash
docker-compose exec backend zsh -c "ls -la"
```

**Option 3: Direct docker exec**
```bash
docker exec -it web-shell-backend zsh
```

### Customization

To customize the shell environment:

1. Edit the configuration files:
   - `/backend/.zshrc.docker` - Zsh configuration
   - `/backend/.bashrc.docker` - Bash configuration

2. Rebuild the container:
   ```bash
   docker-compose build backend
   docker-compose up -d
   ```

### Adding More Tools

To add additional tools to the container, edit the Dockerfile:

```dockerfile
# In backend/Dockerfile, add to the RUN apk add command:
RUN apk add --no-cache \
    existing-packages \
    your-new-package \
    && rm -rf /var/cache/apk/*
```

## Differences from Host Environment

The container shell environment is intentionally minimal compared to the host system:

**Included**:
- Core Unix utilities
- Basic shell features (completion, history, aliases)
- Essential development tools
- Colorized output

**Not Included**:
- Oh My Zsh framework (too heavy for containers)
- Powerlevel10k theme (reduces startup time)
- NVM, RVM (Node/Ruby versions managed by base image)
- Host-specific tools and configurations
- Personal dotfiles and customizations

## Performance Considerations

The shell configuration is optimized for:
- Fast startup time (~50ms)
- Low memory footprint
- No external dependencies
- Quick command execution

## Troubleshooting

### Shell not starting
```bash
# Check if zsh is available
docker-compose exec backend which zsh

# Fallback to bash
docker-compose exec backend bash
```

### Configuration not loading
```bash
# Verify files exist
docker-compose exec backend ls -la /home/node/

# Check file permissions
docker-compose exec backend ls -l /home/node/.zshrc
```

### Missing tools
```bash
# List all installed packages
docker-compose exec backend apk list --installed

# Search for available packages
docker-compose exec backend apk search <package-name>
```

## Security Notes

- Shell runs as `node` user (non-root)
- Limited to container filesystem
- No sudo/doas access
- Package installation requires image rebuild
- History files are ephemeral (lost on container restart unless mounted)

## Future Enhancements

Potential improvements for the shell environment:

- [ ] Persistent history via volume mount
- [ ] Custom key bindings
- [ ] Git prompt integration
- [ ] FZF (fuzzy finder) integration
- [ ] Additional language-specific tools (Python, Go, etc.)
- [ ] Container-aware prompt showing service name
