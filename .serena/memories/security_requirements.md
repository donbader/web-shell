# Security Requirements - Critical Implementation Guidelines

## 🔴 CRITICAL: Authentication Security

### Google OAuth Implementation Rules

**Server-Side Token Validation (MANDATORY)**
```typescript
// ✅ CORRECT: Always verify tokens server-side
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID  // CRITICAL: Verify audience
  });
  const payload = ticket.getPayload();
  
  // CRITICAL: Validate issuer
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid token issuer');
  }
  
  return payload;
}

// ❌ WRONG: Never trust client-provided tokens without verification
```

**Token Storage Security**
```typescript
// ✅ RECOMMENDED: httpOnly cookies (XSS protection)
res.cookie('session', sessionToken, {
  httpOnly: true,           // CRITICAL: Prevents JavaScript access
  secure: true,             // CRITICAL: HTTPS only
  sameSite: 'strict',       // CRITICAL: CSRF protection
  maxAge: 24 * 60 * 60 * 1000
});

// ⚠️ ACCEPTABLE: localStorage (less secure, simpler dev)
// Only use for development or if httpOnly cookies not feasible
```

### Session JWT Security

**JWT Configuration**
```typescript
// ✅ CORRECT: Strong secret, appropriate expiration
const sessionToken = jwt.sign(
  { userId, email, name },
  process.env.JWT_SECRET,  // CRITICAL: Min 32 chars, random
  { 
    expiresIn: '24h',      // CRITICAL: Set expiration
    issuer: 'web-shell',
    audience: 'web-shell-client'
  }
);

// CRITICAL: JWT_SECRET requirements
// - Minimum 32 characters
// - Cryptographically random
// - Never committed to git
// - Rotated periodically
```

**WebSocket Authentication**
```typescript
// ✅ CORRECT: Validate JWT before upgrade
wss.on('connection', async (ws, req) => {
  const token = extractTokenFromRequest(req);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.userId;
  } catch (error) {
    ws.close(1008, 'Unauthorized');  // CRITICAL: Close immediately
    return;
  }
  
  // Continue with authenticated connection
});

// ❌ WRONG: Never allow unauthenticated WebSocket connections
```

---

## 🔴 CRITICAL: Process Isolation

### PTY Security Configuration

**Non-Root Execution**
```typescript
// ✅ CORRECT: Spawn as non-root user
import * as pty from 'node-pty';

const shell = pty.spawn('/bin/bash', [], {
  name: 'xterm-color',
  cwd: '/home/appuser',     // CRITICAL: User home, not root
  env: {
    USER: 'appuser',         // CRITICAL: Non-root user
    HOME: '/home/appuser',
    PATH: '/usr/local/bin:/usr/bin:/bin',  // CRITICAL: Limited PATH
    SHELL: '/bin/bash'
  },
  uid: 1000,                 // CRITICAL: Non-root UID
  gid: 1000
});

// ❌ WRONG: Never spawn as root or with elevated privileges
```

**Resource Limits**
```typescript
// ✅ CORRECT: Strict resource limits per terminal
const resourceLimits = {
  maxMemoryMB: 256,           // CRITICAL: Memory cap
  maxCPUPercent: 50,          // CRITICAL: CPU throttle
  maxProcesses: 50,           // CRITICAL: Process limit
  maxOpenFiles: 100,          // CRITICAL: File descriptor limit
  timeoutMinutes: 60          // CRITICAL: Idle timeout
};

// Implementation via cgroups or process monitoring
// CRITICAL: Monitor and enforce these limits
```

### Environment Restrictions

**Restricted Environment Variables**
```typescript
// ✅ CORRECT: Minimal, safe environment
const safeEnv = {
  USER: 'appuser',
  HOME: '/home/appuser',
  PATH: '/usr/local/bin:/usr/bin:/bin',
  SHELL: '/bin/bash',
  TERM: 'xterm-256color',
  LANG: 'en_US.UTF-8'
};

// ❌ FORBIDDEN: Never expose
const dangerousEnv = {
  AWS_ACCESS_KEY_ID: 'xxx',   // ❌ No cloud credentials
  DATABASE_URL: 'xxx',         // ❌ No database access
  GOOGLE_CLIENT_SECRET: 'xxx', // ❌ No API secrets
  JWT_SECRET: 'xxx'            // ❌ No app secrets
};
```

---

## 🔴 CRITICAL: Network Security

### HTTPS/WSS Enforcement

**Production Requirements**
```typescript
// ✅ CORRECT: HTTPS enforced
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// WebSocket Secure (WSS) required
const wss = new WebSocketServer({
  server: httpsServer  // CRITICAL: Use HTTPS server, not HTTP
});
```

**Security Headers**
```typescript
import helmet from 'helmet';

// ✅ CORRECT: Comprehensive security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "wss://yourdomain.com"],
      frameSrc: ["https://accounts.google.com"]
    }
  },
  hsts: {
    maxAge: 31536000,         // CRITICAL: 1 year HSTS
    includeSubDomains: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));
```

### CORS Configuration

```typescript
// ✅ CORRECT: Strict CORS policy
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,           // CRITICAL: Allow cookies
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ❌ WRONG: Never use in production
// app.use(cors({ origin: '*' }));  // ❌ Allows any origin
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// ✅ CORRECT: Aggressive rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 5,                       // CRITICAL: 5 attempts max
  message: 'Too many login attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,     // 1 minute
  max: 100,                     // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
```

---

## 🔴 CRITICAL: Container Security

### Dockerfile Security

```dockerfile
# ✅ CORRECT: Multi-stage build with non-root user
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
# CRITICAL: Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --chown=appuser:appuser . .

# CRITICAL: Switch to non-root user
USER appuser

# CRITICAL: Expose non-privileged port
EXPOSE 3000

CMD ["node", "dist/server.js"]

# ❌ WRONG: Running as root
# USER root  # ❌ Never run as root
```

### Docker Compose Security

```yaml
# ✅ CORRECT: Security-hardened compose
version: '3.8'

services:
  backend:
    build: ./backend
    read_only: true              # CRITICAL: Read-only root filesystem
    security_opt:
      - no-new-privileges:true   # CRITICAL: Prevent privilege escalation
    cap_drop:
      - ALL                      # CRITICAL: Drop all capabilities
    tmpfs:
      - /tmp                     # Writable tmp
    environment:
      - NODE_ENV=production
    networks:
      - app-network
    restart: unless-stopped
    
networks:
  app-network:
    driver: bridge

# ❌ WRONG: Dangerous configurations
# privileged: true              # ❌ Never use privileged mode
# network_mode: host            # ❌ Never use host network
```

---

## 🔴 CRITICAL: Input/Output Security

### XSS Prevention

```typescript
// ✅ CORRECT: Terminal output sanitization
import DOMPurify from 'isomorphic-dompurify';

function sanitizeTerminalOutput(data: string): string {
  // CRITICAL: Sanitize before rendering in DOM
  return DOMPurify.sanitize(data, {
    ALLOWED_TAGS: [],           // No HTML tags allowed
    KEEP_CONTENT: true
  });
}

// xterm.js handles this internally, but verify configuration
terminal.options.allowProposedApi = false;  // CRITICAL: Disable experimental APIs
```

### Session Management

```typescript
// ✅ CORRECT: Session limits and cleanup
const MAX_SESSIONS_PER_USER = 5;
const IDLE_TIMEOUT_MINUTES = 30;

class SessionManager {
  private sessions = new Map<string, SessionData>();
  
  createSession(userId: string): string {
    // CRITICAL: Enforce session limits
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= MAX_SESSIONS_PER_USER) {
      throw new Error('Maximum sessions exceeded');
    }
    
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
    
    return sessionId;
  }
  
  // CRITICAL: Cleanup idle sessions
  cleanupIdleSessions() {
    const now = Date.now();
    const timeout = IDLE_TIMEOUT_MINUTES * 60 * 1000;
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        this.terminateSession(id);
      }
    }
  }
}
```

---

## Environment Variables - Security Checklist

### Required Secrets (NEVER commit to git)

```bash
# Backend .env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx          # CRITICAL: Keep secret
JWT_SECRET=xxx                            # CRITICAL: Min 32 chars random
SESSION_EXPIRY=24h
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production

# Optional: Domain restriction
ALLOWED_DOMAINS=yourdomain.com,gmail.com

# Resource limits
MAX_SESSIONS_PER_USER=5
IDLE_TIMEOUT_MINUTES=30
MAX_MEMORY_MB=256
MAX_CPU_PERCENT=50
```

### .gitignore Requirements

```
# CRITICAL: Never commit secrets
.env
.env.local
.env.production
*.key
*.pem
secrets/
credentials/
```

---

## Security Testing Checklist

### Pre-Production Validation

- [ ] Google OAuth tokens verified server-side only
- [ ] JWT secrets are cryptographically random (32+ chars)
- [ ] WebSocket connections require valid JWT
- [ ] PTY processes run as non-root user
- [ ] Resource limits enforced per terminal
- [ ] HTTPS/WSS enabled in production
- [ ] Security headers configured (helmet.js)
- [ ] CORS restricted to allowed origins
- [ ] Rate limiting prevents brute force
- [ ] Docker containers run as non-root
- [ ] No secrets in Docker images
- [ ] Session timeout enforced
- [ ] Idle sessions cleaned up
- [ ] Error messages don't leak info
- [ ] Logging excludes sensitive data

---

## Threat Model

### Attack Vectors & Mitigations

**1. Authentication Bypass**
- Attack: Forged Google ID tokens
- Mitigation: Server-side token verification with google-auth-library

**2. Session Hijacking**
- Attack: Stolen JWT tokens
- Mitigation: httpOnly cookies, short expiration, HTTPS only

**3. Command Injection**
- Attack: Malicious shell commands
- Mitigation: PTY runs in isolated environment with resource limits

**4. Privilege Escalation**
- Attack: Exploit to gain root access
- Mitigation: Non-root container user, dropped capabilities

**5. Resource Exhaustion (DoS)**
- Attack: Spawn unlimited terminals/processes
- Mitigation: Session limits, resource caps, rate limiting

**6. XSS via Terminal Output**
- Attack: Malicious escape sequences
- Mitigation: xterm.js sanitization, CSP headers

**7. Credential Leakage**
- Attack: Access to environment variables with secrets
- Mitigation: Restricted env, no secret exposure to PTY

---

## Security Review Gates

### Phase 2 (Auth) Review
- [ ] Google OAuth flow follows best practices
- [ ] Tokens validated server-side only
- [ ] Session JWTs properly configured
- [ ] No secrets in client code

### Phase 3 (Terminal) Review
- [ ] PTY spawns as non-root
- [ ] Environment variables restricted
- [ ] Resource limits configured
- [ ] Process cleanup on disconnect

### Phase 5 (Hardening) Review
- [ ] HTTPS/WSS enforced
- [ ] All security headers set
- [ ] Rate limiting active
- [ ] Error handling secure

### Phase 6 (Docker) Review
- [ ] Containers run as non-root
- [ ] No privileged mode
- [ ] Read-only filesystem where possible
- [ ] No secrets in images
