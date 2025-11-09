# Environment Variables Reference

Complete reference for all environment variables used in the Web Shell application.

## Table of Contents

- [Backend Variables](#backend-variables)
  - [Required Variables](#required-variables-production)
  - [Optional Variables](#optional-variables)
  - [HTTPS/SSL Configuration](#httpsssl-configuration)
- [Frontend Variables](#frontend-variables)
- [Removed Variables](#removed-variables)
- [Security Best Practices](#security-best-practices)
- [Deployment Examples](#deployment-examples)

---

## Backend Variables

### Required Variables (Production)

These variables **MUST** be configured for production deployments.

#### `PORT`
- **Type**: Number
- **Default**: `3000`
- **Description**: Server port for HTTP/HTTPS and WebSocket connections
- **Example**: `PORT=3000`
- **Notes**: Ensure firewall allows traffic on this port

#### `NODE_ENV`
- **Type**: String
- **Default**: `development`
- **Values**: `development` | `production`
- **Description**: Node.js environment mode
- **Example**: `NODE_ENV=production`
- **Impact**:
  - Production mode enables stricter security validations
  - Different logging levels and error handling
  - HTTPS/auth warnings triggered in production

#### `JWT_SECRET`
- **Type**: String (minimum 32 characters)
- **Required**: Yes (production)
- **Description**: Secret key for JWT token signing and verification
- **Generate**: `openssl rand -base64 32`
- **Example**: `JWT_SECRET=AbCdEfGh1234567890IjKlMnOpQrStUvWxYz==`
- **Security**:
  - ⚠️ CRITICAL: Never commit this to version control
  - Must be at least 32 characters
  - Use cryptographically secure random generation
  - Rotate periodically for security

---

### Optional Variables

These variables have sensible defaults but can be customized.

#### Authentication

##### `AUTH_ENABLED`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable/disable authentication system
- **Example**: `AUTH_ENABLED=true`
- **Notes**: Should be `true` in production for security
- **Phase**: Planned for Phase 6 (OAuth integration)

##### `GOOGLE_CLIENT_ID`
- **Type**: String
- **Default**: None
- **Description**: Google OAuth client ID (future feature)
- **Example**: `GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com`
- **Status**: Not yet implemented (Phase 6)

##### `GOOGLE_CLIENT_SECRET`
- **Type**: String
- **Default**: None
- **Description**: Google OAuth client secret (future feature)
- **Example**: `GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx`
- **Status**: Not yet implemented (Phase 6)

#### Session Management

##### `SESSION_EXPIRY`
- **Type**: String (time format)
- **Default**: `24h`
- **Description**: JWT token lifetime
- **Format**: `<number><unit>` where unit is `h` (hours), `m` (minutes), or `d` (days)
- **Examples**:
  - `SESSION_EXPIRY=1h` (1 hour)
  - `SESSION_EXPIRY=30m` (30 minutes)
  - `SESSION_EXPIRY=7d` (7 days)
- **Recommendations**:
  - Development: `24h` or longer
  - Production: `1h` to `8h` for security

##### `MAX_SESSIONS_PER_USER`
- **Type**: Number
- **Default**: `5`
- **Description**: Maximum concurrent sessions per user
- **Example**: `MAX_SESSIONS_PER_USER=3`
- **Purpose**: Prevents resource exhaustion from abandoned sessions
- **Range**: Recommended 1-20

##### `IDLE_TIMEOUT_MINUTES`
- **Type**: Number
- **Default**: `30`
- **Description**: Auto-close sessions after this many minutes of inactivity
- **Example**: `IDLE_TIMEOUT_MINUTES=60`
- **Range**: Recommended 15-1440 (15 min to 24 hours)

#### CORS Configuration

##### `CORS_ORIGINS`
- **Type**: String (comma-separated list)
- **Default**: `http://localhost:5173`
- **Description**: Allowed CORS origins for API requests
- **Examples**:
  - Single origin: `CORS_ORIGINS=https://app.example.com`
  - Multiple: `CORS_ORIGINS=https://app.example.com,https://admin.example.com`
- **Security**:
  - Never use `*` in production
  - Only include trusted domains
  - Match protocol (http/https)

#### Docker Configuration

##### `DOCKER_HOST`
- **Type**: String
- **Default**: `/var/run/docker.sock`
- **Description**: Docker daemon connection endpoint
- **Examples**:
  - Unix socket: `DOCKER_HOST=/var/run/docker.sock`
  - TCP via proxy: `DOCKER_HOST=tcp://docker-proxy:2375`
- **Notes**:
  - Unix socket is more secure (local only)
  - TCP connection useful for Docker-in-Docker setups
  - Ensure proper permissions for socket access

---

### HTTPS/SSL Configuration

Recommended for production deployments to enable encrypted connections.

#### `USE_HTTPS`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable HTTPS/WSS encrypted connections
- **Example**: `USE_HTTPS=true`
- **Requires**: Valid SSL certificates at specified paths
- **Impact**:
  - Enables HTTPS for API
  - Enables WSS for WebSocket
  - Requires SSL_KEY_PATH and SSL_CERT_PATH

#### `SSL_KEY_PATH`
- **Type**: String (file path)
- **Default**: `./certs/key.pem`
- **Description**: Path to SSL private key file
- **Example**: `SSL_KEY_PATH=/etc/ssl/private/server.key`
- **Required**: Only if `USE_HTTPS=true`
- **Security**: Ensure file has restricted permissions (600)

#### `SSL_CERT_PATH`
- **Type**: String (file path)
- **Default**: `./certs/cert.pem`
- **Description**: Path to SSL certificate file
- **Example**: `SSL_CERT_PATH=/etc/ssl/certs/server.crt`
- **Required**: Only if `USE_HTTPS=true`
- **Notes**: Can be self-signed for development, use CA-signed for production

#### `HTTP_PORT`
- **Type**: Number
- **Default**: `80`
- **Description**: HTTP port for redirect to HTTPS (production only)
- **Example**: `HTTP_PORT=8080`
- **Purpose**: Automatically redirects HTTP → HTTPS in production
- **Active**: Only when `USE_HTTPS=true` and `NODE_ENV=production`

---

## Frontend Variables

All frontend environment variables must be prefixed with `VITE_`.

### Required Variables

#### `VITE_API_URL`
- **Type**: String (URL)
- **Default**: `http://localhost:3000`
- **Description**: Backend API base URL
- **Examples**:
  - Development: `VITE_API_URL=http://localhost:3000`
  - Production: `VITE_API_URL=https://api.example.com`
- **Notes**: Must match backend server URL and protocol

#### `VITE_WS_URL`
- **Type**: String (URL)
- **Default**: `ws://localhost:3000`
- **Description**: WebSocket connection URL
- **Examples**:
  - Development: `VITE_WS_URL=ws://localhost:3000`
  - Production: `VITE_WS_URL=wss://api.example.com`
- **Notes**:
  - Protocol must match API_URL (`http` → `ws`, `https` → `wss`)
  - Should point to same host as API_URL

### Optional Variables

#### `VITE_GOOGLE_CLIENT_ID`
- **Type**: String
- **Description**: Google OAuth client ID (future feature)
- **Example**: `VITE_GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com`
- **Status**: Not yet implemented (Phase 6)

### Important Notes

- Frontend environment variables are **embedded at build time**, not runtime
- Changes require rebuilding the frontend: `npm run build`
- Variables are exposed in client-side code (don't put secrets here)

---

## Removed Variables

These variables were previously defined but are no longer used. Documented here for reference.

### Rate Limiting (Not Implemented)

- `RATE_LIMIT_WINDOW_MS` - Planned for Phase 4
- `RATE_LIMIT_MAX_REQUESTS` - Planned for Phase 4

**Reason**: Rate limiting feature not yet implemented. Will be added in Phase 4 with proper configuration.

### PTY Resource Limits (Replaced)

- `MAX_PTY_PROCESSES` - Removed
- `PTY_MEMORY_LIMIT_MB` - Removed
- `PTY_CPU_LIMIT_PERCENT` - Removed

**Reason**: Resource limits are now enforced through Docker container constraints in `containerManager.ts` rather than environment variables. This provides better isolation and security.

**See**: `backend/src/services/containerManager.ts` for current resource limit implementation.

---

## Security Best Practices

### General Guidelines

1. **Never Commit Secrets**: Use `.env` files (git-ignored) for sensitive values
2. **Rotate Secrets**: Periodically regenerate JWT_SECRET and other secrets
3. **Minimal Permissions**: Grant only necessary access to configuration files
4. **Environment Separation**: Use different values for dev/staging/production
5. **Secret Management**: Consider using secret management tools (Vault, AWS Secrets Manager)

### Production Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is set to a strong, unique value (32+ characters)
- [ ] `AUTH_ENABLED=true` (when authentication feature is implemented)
- [ ] `USE_HTTPS=true` with valid SSL certificates
- [ ] `CORS_ORIGINS` only includes production domains (no localhost)
- [ ] SSL certificate files have restricted permissions (600)
- [ ] All default development values are replaced

### Development Recommendations

- Use `.env.local` for local overrides (git-ignored)
- Generate self-signed certificates for HTTPS testing:
  ```bash
  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
  ```
- Keep `AUTH_ENABLED=false` for easier testing
- Use `http://localhost` for CORS during development

---

## Deployment Examples

### Development (Local)

```bash
# Backend (.env)
PORT=3000
NODE_ENV=development
JWT_SECRET=development-secret-key-change-in-production
AUTH_ENABLED=false
CORS_ORIGINS=http://localhost:5173
USE_HTTPS=false
SESSION_EXPIRY=24h
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30

# Frontend (.env)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Production (HTTPS)

```bash
# Backend (.env)
PORT=3000
NODE_ENV=production
JWT_SECRET=<generated-with-openssl-rand-base64-32>
AUTH_ENABLED=true
CORS_ORIGINS=https://app.example.com
USE_HTTPS=true
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CERT_PATH=/etc/ssl/certs/server.crt
HTTP_PORT=80
SESSION_EXPIRY=8h
MAX_SESSIONS_PER_USER=3
IDLE_TIMEOUT_MINUTES=60
DOCKER_HOST=/var/run/docker.sock

# Frontend (.env)
VITE_API_URL=https://app.example.com
VITE_WS_URL=wss://app.example.com
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    environment:
      - PORT=3000
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}  # From .env file
      - AUTH_ENABLED=true
      - CORS_ORIGINS=${CORS_ORIGINS}
      - DOCKER_HOST=tcp://docker-proxy:2375

  frontend:
    environment:
      - VITE_API_URL=https://api.example.com
      - VITE_WS_URL=wss://api.example.com
```

### Kubernetes ConfigMap/Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-shell-config
data:
  PORT: "3000"
  NODE_ENV: "production"
  CORS_ORIGINS: "https://app.example.com"
  SESSION_EXPIRY: "8h"
  MAX_SESSIONS_PER_USER: "3"

---
apiVersion: v1
kind: Secret
metadata:
  name: web-shell-secrets
type: Opaque
stringData:
  JWT_SECRET: <base64-encoded-secret>
```

---

## Validation and Warnings

The application automatically validates environment configuration at startup and logs warnings for potential security issues:

### Production Warnings

- ⚠️ Running without HTTPS in production
- ⚠️ Authentication disabled in production
- ⚠️ CORS includes localhost in production
- ⚠️ CORS set to wildcard (`*`)

### General Warnings

- ⚠️ Session expiry is too short (< 15 minutes)
- ⚠️ Idle timeout is too long (> 24 hours)
- ⚠️ Max sessions per user is too high (> 20)

See `backend/src/config/validation.ts` for complete validation logic.

---

## Troubleshooting

### "JWT_SECRET must be set in production"

**Solution**: Set `JWT_SECRET` environment variable with at least 32 characters:
```bash
export JWT_SECRET=$(openssl rand -base64 32)
```

### "ENOENT: no such file or directory" (SSL certificates)

**Solution**:
1. Verify `SSL_KEY_PATH` and `SSL_CERT_PATH` point to existing files
2. Check file permissions (should be readable by application)
3. For development, generate self-signed certificates or set `USE_HTTPS=false`

### CORS errors in browser

**Solution**:
1. Ensure `CORS_ORIGINS` includes your frontend URL
2. Match protocols (http/https)
3. Include port numbers if non-standard
4. Restart backend after changing CORS configuration

### WebSocket connection failures

**Solution**:
1. Ensure `VITE_WS_URL` protocol matches API protocol (`http` → `ws`, `https` → `wss`)
2. Check firewall allows WebSocket connections
3. Verify backend is accessible at specified URL
4. Check browser console for detailed error messages

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guide](../security/SECURITY.md)
- [Docker Setup](./DOCKER.md)
- [HTTPS Configuration](./HTTPS_SETUP.md)
