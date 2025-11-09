# Environment Variables Quick Reference

## Essential Production Variables

### Must Configure

```bash
# Security (CRITICAL)
JWT_SECRET=<openssl rand -base64 32>  # Generate with command shown

# Environment
NODE_ENV=production
PORT=3000

# HTTPS (Recommended)
USE_HTTPS=true
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CERT_PATH=/etc/ssl/certs/server.crt

# Security Features
AUTH_ENABLED=true  # When Phase 6 is implemented

# CORS (Important)
CORS_ORIGINS=https://your-domain.com  # NO wildcards or localhost
```

## Common Development Setup

```bash
# Backend (.env)
PORT=3000
NODE_ENV=development
JWT_SECRET=development-secret-key-change-in-production
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:5173
USE_HTTPS=false

# Frontend (.env)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Quick Troubleshooting

### Generate JWT Secret
```bash
openssl rand -base64 32
```

### Self-Signed Certificates (Development)
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Common Warnings

| Warning | Fix |
|---------|-----|
| "JWT_SECRET must be set" | Generate and set `JWT_SECRET=<output>` |
| "Production without HTTPS" | Set `USE_HTTPS=true` with certificates |
| "CORS includes localhost" | Remove localhost from `CORS_ORIGINS` |
| "Authentication disabled" | Set `AUTH_ENABLED=true` |

## Variable Status

| Category | Count | Status |
|----------|-------|--------|
| Required (Production) | 3 | PORT, NODE_ENV, JWT_SECRET |
| Optional (With Defaults) | 9 | AUTH, Session, CORS, Docker, HTTPS |
| Removed (Unused) | 5 | Rate limiting, PTY limits |
| Future (Planned) | 2 | Google OAuth (Phase 6) |

## Documentation

- Full Reference: `/docs/deployment/ENVIRONMENT_VARIABLES.md`
- Backend Example: `/backend/.env.example`
- Frontend Example: `/frontend/.env.example`
- Validation Code: `/backend/src/config/validation.ts`

## Security Checklist

- [ ] JWT_SECRET is strong (32+ chars) and secret
- [ ] NODE_ENV=production in production
- [ ] USE_HTTPS=true in production
- [ ] CORS_ORIGINS lists only trusted domains
- [ ] AUTH_ENABLED=true in production (Phase 6+)
- [ ] SSL certificates have restricted permissions (600)
- [ ] No secrets committed to version control
