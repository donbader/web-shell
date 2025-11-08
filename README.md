# Web Shell - Browser-based Terminal Application

A secure, browser-based terminal application with Google OAuth authentication and multi-window support.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with Google accounts
- 💻 **Real-time Shell Execution** - Execute shell commands directly in the browser
- 📑 **Multi-Window Support** - Multiple concurrent terminal sessions with tab interface
- 🐳 **Fully Dockerized** - Complete containerization for easy deployment
- 🔒 **Security-Focused** - Process isolation, resource limits, HTTPS/WSS encryption

## Architecture

**Frontend**: React 18 + TypeScript + Vite + xterm.js
**Backend**: Node.js + Express + TypeScript + WebSocket + node-pty
**Auth**: Google OAuth 2.0 + JWT session management
**Deployment**: Docker + docker-compose

## Project Status

🚧 **In Development** - Following SuperClaude framework implementation workflow

### Implementation Phases

- [ ] **Phase 1**: Foundation Setup (Git, Frontend scaffold, Backend scaffold)
- [ ] **Phase 2**: Google OAuth Integration (Complete auth flow)
- [ ] **Phase 3**: Core Terminal (Single window with PTY)
- [ ] **Phase 4**: Multi-Window Support (Tabbed interface)
- [ ] **Phase 5**: Production Hardening (Security, monitoring)
- [ ] **Phase 6**: Docker Deployment (Full containerization)

## Prerequisites

- Node.js 20 LTS
- Docker & docker-compose
- Google Cloud Platform account (for OAuth credentials)

## Quick Start (Coming Soon)

```bash
# Clone repository
git clone <repository-url>
cd web-shell

# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your Google OAuth credentials

# Start development servers
npm run dev

# Or use Docker
docker-compose up
```

## Security

This application provides shell access through a web browser. Please review [docs/SECURITY.md](docs/SECURITY.md) for critical security guidelines before deployment.

**⚠️ Never deploy without**:
- Google OAuth authentication enabled
- HTTPS/WSS in production
- Resource limits configured
- Security headers set

## Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Security Requirements](docs/SECURITY.md)
- [Implementation Workflow](docs/WORKFLOW.md)
- [API Documentation](docs/API.md) (Coming soon)

## License

[License TBD]

## Contributing

[Contributing guidelines TBD]
