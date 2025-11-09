# Password-Based Authentication Guide

## Overview

The web-shell now supports password-based authentication with session management and expiration. This provides secure access control to your terminal environment.

## Features

✅ **Password Authentication**: Username/password login system
✅ **Session Management**: JWT-based session tokens with expiration
✅ **httpOnly Cookies**: Secure token storage preventing XSS attacks
✅ **Session Expiration**: Configurable timeout (default: 24 hours)
✅ **Auto Cleanup**: Expired sessions are automatically removed
✅ **Dev Mode**: Optional bypass for development environments

## Quick Start

### Enable Authentication

1. Update `.env` or `.env.docker`:
```bash
AUTH_ENABLED=true
VITE_AUTH_ENABLED=true
JWT_SECRET=your-very-secure-random-secret-key-minimum-32-characters
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=your-secure-password
SESSION_EXPIRY=24h
```

2. Rebuild and restart:
```bash
docker compose build
docker compose up -d
```

3. Access the application and login with your credentials

### Default Credentials

**Username**: `admin`
**Password**: `admin123`

⚠️ **Important**: Change the default password in production!

## Configuration

### Environment Variables

**Backend (.env)**:
```bash
# Enable/disable authentication
AUTH_ENABLED=true

# JWT secret key (minimum 32 characters)
JWT_SECRET=your-secret-key-here

# Session expiration (s=seconds, m=minutes, h=hours, d=days)
SESSION_EXPIRY=24h

# Default user credentials
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=admin123

# CORS origins (comma-separated)
CORS_ORIGINS=https://yourdomain.com
```

**Frontend (.env)**:
```bash
# Enable authentication UI
VITE_AUTH_ENABLED=true

# API endpoint
VITE_API_URL=https://api.yourdomain.com
```

### Session Expiry Formats

- `60s` - 60 seconds
- `30m` - 30 minutes
- `24h` - 24 hours
- `7d` - 7 days

## Security

### JWT Secret

The JWT secret must be:
- At least 32 characters long
- Cryptographically random
- Never committed to version control
- Rotated periodically

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Password Storage

- Passwords are hashed using bcrypt (10 rounds)
- Never stored in plain text
- Resistant to rainbow table attacks

### Session Storage

- Sessions stored as httpOnly cookies
- Prevents JavaScript access (XSS protection)
- SameSite=strict (CSRF protection)
- Secure flag in production (HTTPS only)

### WebSocket Authentication

WebSockets authenticate using:
1. Cookie header (primary)
2. Authorization header (Bearer token)
3. Query parameter (fallback)

## API Endpoints

### POST `/api/auth/login`

Login with username and password.

**Request**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "user": {
    "userId": "user-001",
    "email": "admin@localhost",
    "name": "Administrator"
  },
  "expiresAt": 1699876543210
}
```

**Response** (Error):
```json
{
  "error": "Invalid username or password"
}
```

### POST `/api/auth/logout`

Logout and invalidate session.

**Response**:
```json
{
  "success": true
}
```

### GET `/api/auth/verify`

Verify current session status.

**Response** (Authenticated):
```json
{
  "success": true,
  "user": {
    "userId": "user-001",
    "email": "admin@localhost",
    "name": "Administrator"
  }
}
```

**Response** (Not Authenticated):
```json
{
  "error": "Not authenticated"
}
```

## User Management

### Current Implementation

- Single default user (in-memory)
- Configured via environment variables
- Suitable for personal/development use

### Production Considerations

For production environments, consider:
1. Database-backed user storage
2. User registration/management UI
3. Password reset functionality
4. Multi-user support
5. Role-based access control

## Session Management

### How It Works

1. **Login**: User provides credentials → Backend verifies → JWT token generated
2. **Storage**: Token stored in httpOnly cookie + localStorage
3. **Requests**: Token sent with API requests via cookie or Authorization header
4. **WebSocket**: Token extracted from cookie, header, or query parameter
5. **Expiration**: Sessions expire after configured time or idle timeout
6. **Cleanup**: Expired sessions removed every 5 minutes

### Session Limits

- Maximum sessions per user: 5 (configurable via `MAX_SESSIONS_PER_USER`)
- Idle timeout: 30 minutes (configurable via `IDLE_TIMEOUT_MINUTES`)
- Absolute expiration: 24 hours (configurable via `SESSION_EXPIRY`)

## Development Mode

Disable authentication for local development:

```bash
AUTH_ENABLED=false
VITE_AUTH_ENABLED=false
```

When disabled:
- No login required
- All requests use mock "dev-user"
- Suitable for local testing only

## Troubleshooting

### Cannot Login

1. Check credentials match `.env` configuration
2. Verify `AUTH_ENABLED=true` in backend
3. Check browser console for network errors
4. Ensure backend is running and accessible

### Session Expires Too Quickly

1. Increase `SESSION_EXPIRY` value
2. Check `IDLE_TIMEOUT_MINUTES` setting
3. Verify system clock is correct

### CORS Errors

1. Add frontend URL to `CORS_ORIGINS`
2. Ensure `credentials: 'include'` in fetch requests
3. Check browser console for specific CORS error

### WebSocket Connection Fails

1. Verify token is being sent
2. Check token hasn't expired
3. Ensure cookie domain matches
4. Try query parameter fallback: `?token=<your-token>`

## Migration from Dev Mode

To migrate from development mode to production:

1. **Generate Secure JWT Secret**:
```bash
openssl rand -base64 32
```

2. **Update Environment**:
```bash
AUTH_ENABLED=true
VITE_AUTH_ENABLED=true
JWT_SECRET=<generated-secret>
DEFAULT_PASSWORD=<secure-password>
```

3. **Rebuild**:
```bash
docker compose build
docker compose up -d
```

4. **Test Login**:
- Access application
- Login with credentials
- Verify terminal access

## Security Best Practices

✅ Change default password immediately
✅ Use strong JWT secret (32+ characters)
✅ Enable HTTPS in production
✅ Set appropriate session expiry
✅ Monitor failed login attempts
✅ Rotate JWT secret periodically
✅ Keep dependencies updated
✅ Review security logs regularly

## Future Enhancements

Potential improvements:
- [ ] Multi-user support with database
- [ ] User registration and management
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Role-based access control
- [ ] Audit logging
- [ ] Rate limiting on login attempts
- [ ] Session management UI
