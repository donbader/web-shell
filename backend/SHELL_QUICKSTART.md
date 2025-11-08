# Quick Start: Enhanced Shell Environment

## Summary

Your Docker container now includes a fully-featured shell environment similar to your host system.

## What's Installed

### Shells
- **Zsh** (primary) with autosuggestions and syntax highlighting
- **Bash** (fallback) with completion

### Development Tools
- `git`, `vim`, `nano`, `curl`, `wget`, `jq`

### System Utilities
- `htop`, `ncdu`, `tree`, `less`
- Standard: `grep`, `sed`, `tar`, `ps`, `df`, `du`

### Features
- Command history (10,000 entries)
- Auto-completion
- Syntax highlighting (zsh)
- Auto-suggestions (zsh)
- 20+ useful aliases
- Colorized output
- Enhanced prompt

## Usage Examples

### Access the shell (when container is running)
```bash
docker compose exec backend zsh
```

### Run a single command
```bash
docker compose exec backend zsh -c "htop"
```

### Test without running container
```bash
docker run --rm -it <image-id> zsh
```

## Common Aliases

```bash
..     # cd ..
...    # cd ../..
ll     # ls -lh (detailed list)
la     # ls -lAh (all files)
h      # history
c      # clear
psa    # ps aux
```

## Configuration Files

- Zsh: `/backend/.zshrc.docker` → `/home/node/.zshrc`
- Bash: `/backend/.bashrc.docker` → `/home/node/.bashrc`

## Documentation

See `backend/SHELL_ENVIRONMENT.md` for complete documentation.
