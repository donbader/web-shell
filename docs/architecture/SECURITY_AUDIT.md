# 🔒 Web Shell - Security Audit & Implementation Plan

**Date**: 2025-11-09
**Current Risk Score**: 7.5/10 (High Risk)
**Target Risk Score**: 3.0/10 (Low Risk)

## Executive Summary

Comprehensive security audit identified 13 vulnerabilities requiring immediate attention before production deployment. This document outlines the phased implementation plan to secure the web-shell application with single-password authentication.

---

## Critical Findings

### 🔴 Immediate Risks (Block Production)

1. **SSL Private Key in Git Repository** - CRITICAL
   - Private key exposed in `backend/certs/key.pem`
   - Must regenerate and secure immediately

2. **Weak JWT Secret** - CRITICAL
   - Default fallback secret allows token forgery
   - Must enforce strong secret in production

3. **No HTTPS/WSS Enforcement** - CRITICAL
   - Credentials transmitted in plaintext
   - Must implement TLS before deployment

4. **Docker Socket Direct Mount** - CRITICAL
   - Container escape → full host compromise
   - Must implement socket proxy

### 🟡 High Priority (Before Beta)

5. **No Rate Limiting** - HIGH
   - Brute force attacks possible (unlimited attempts)

6. **Missing Container Resource Limits** - HIGH
   - DoS via resource exhaustion

7. **Insecure Token Storage** - MEDIUM-HIGH
   - localStorage vulnerable to XSS

8. **No Input Validation** - MEDIUM-HIGH
   - WebSocket message validation missing

---

## Implementation Phases

### Phase 1: Critical Security Fixes (Day 1-2)

**Priority 1A: Remove Secrets from Git**
- [ ] Remove `backend/certs/*.pem` from repository
- [ ] Remove `backend/.env` from repository
- [ ] Update .gitignore to prevent future commits
- [ ] Regenerate SSL certificates
- [ ] Audit git history for other secrets

**Priority 1B: JWT Security** ✅ COMPLETED
- [x] Enforce JWT_SECRET validation in production
- [x] Add minimum length requirement (32+ chars)
- [x] Add startup validation script
- [ ] Generate secure production secret (deployment-time requirement)

**Priority 1C: HTTPS/WSS Enforcement**
- [ ] Configure HTTPS server with TLS
- [ ] Redirect HTTP → HTTPS in production
- [ ] Update WebSocket to WSS
- [ ] Configure secure cookie flags

**Priority 1D: Docker Socket Proxy**
- [ ] Deploy `tecnativa/docker-socket-proxy`
- [ ] Configure limited permissions
- [ ] Update backend DOCKER_HOST
- [ ] Test container creation through proxy

### Phase 2: Code Cleanup & Organization (Day 2-3)

**Documentation Consolidation**
- [ ] Move all docs to `/docs/` directory
- [ ] Remove duplicates from `/backend/` and root
- [ ] Create docs index (README.md)
- [ ] Update references in main README

**Console Statement Cleanup**
- [ ] Install winston logging library
- [ ] Replace backend console.* (44 instances)
- [ ] Replace frontend console.* (24 instances)
- [ ] Configure log levels and rotation

**Environment Variable Cleanup**
- [ ] Remove unused variables from .env.example
- [ ] Document which variables are required
- [ ] Add validation for required variables
- [ ] Update configuration documentation

### Phase 3: Single Password Authentication (Day 3-4)

**Backend Implementation**
- [ ] Create password hash generation script
- [ ] Update authService for single-password flow
- [ ] Modify auth routes (remove username)
- [ ] Configure APP_PASSWORD_HASH environment
- [ ] Add rate limiting to auth endpoint

**Frontend Implementation**
- [ ] Simplify login form (password only)
- [ ] Remove username field and logic
- [ ] Update API calls
- [ ] Improve password input UX

**Token Security**
- [ ] Implement httpOnly cookie storage
- [ ] Remove localStorage token usage
- [ ] Configure sameSite=strict
- [ ] Add secure flag for production

### Phase 4: Security Hardening (Day 4-5)

**Rate Limiting**
- [ ] Install express-rate-limit
- [ ] Configure auth endpoint limiter (5 attempts/15 min)
- [ ] Add WebSocket rate limiting (100 msg/min)
- [ ] Log rate limit violations

**Input Validation**
- [ ] Install zod for schema validation
- [ ] Create WebSocket message schemas
- [ ] Validate environment names (whitelist)
- [ ] Validate shell paths (whitelist)
- [ ] Sanitize terminal input (escape sequences)

**Security Headers**
- [ ] Install helmet.js
- [ ] Configure CSP for xterm.js
- [ ] Enable HSTS (31536000s)
- [ ] Configure X-Frame-Options: DENY
- [ ] Enable XSS protection

**Container Resource Limits**
- [ ] Add memory limits (256MB per container)
- [ ] Add CPU limits (0.5 CPU per container)
- [ ] Add PID limits (100 processes)
- [ ] Configure security options (no-new-privileges)
- [ ] Test resource enforcement

### Phase 5: Testing & Validation (Day 5-6)

**Security Testing**
- [ ] Test rate limiting (auth brute force)
- [ ] Test WebSocket validation (malformed messages)
- [ ] Test container resource limits
- [ ] Test Docker socket proxy isolation
- [ ] Verify HTTPS/WSS enforcement

**Functional Testing**
- [ ] Test single-password login flow
- [ ] Test terminal creation (all environments)
- [ ] Test multi-tab functionality
- [ ] Test session persistence
- [ ] Test graceful shutdown

**Production Readiness**
- [ ] Verify all critical vulnerabilities fixed
- [ ] Run type checking (frontend + backend)
- [ ] Test Docker builds (dev + prod)
- [ ] Verify documentation completeness
- [ ] Create deployment checklist

---

## Orchestration Plan

### Execution Strategy

**Parallel Workstreams:**

**Stream 1: Security Foundations (Critical)**
- Agent: security-engineer
- Tasks: Phase 1 (Critical Security Fixes)
- Duration: 2 days
- Dependencies: None (can start immediately)

**Stream 2: Code Quality (Important)**
- Agent: refactoring-expert
- Tasks: Phase 2 (Code Cleanup & Organization)
- Duration: 1 day
- Dependencies: Can run parallel to Stream 1

**Stream 3: Authentication (Sequential)**
- Agent: backend-architect + frontend-architect
- Tasks: Phase 3 (Single Password Authentication)
- Duration: 1-2 days
- Dependencies: Requires Stream 1 complete (JWT security)

**Stream 4: Hardening (Sequential)**
- Agent: security-engineer
- Tasks: Phase 4 (Security Hardening)
- Duration: 1-2 days
- Dependencies: Requires Stream 3 complete (auth flow)

**Stream 5: Validation (Final)**
- Agent: quality-engineer
- Tasks: Phase 5 (Testing & Validation)
- Duration: 1 day
- Dependencies: All previous streams complete

### Timeline

```
Day 1-2:  [Stream 1: Critical Security] + [Stream 2: Code Cleanup]
Day 3-4:  [Stream 3: Single Password Auth]
Day 4-5:  [Stream 4: Security Hardening]
Day 5-6:  [Stream 5: Testing & Validation]
```

**Total Duration**: 5-6 days
**Estimated Effort**: 40-48 hours

---

## Post-Implementation Checklist

### Production Deployment Requirements

- [ ] All 🔴 Critical vulnerabilities fixed
- [ ] All 🟡 High priority vulnerabilities fixed
- [ ] Single-password authentication tested
- [ ] HTTPS/WSS operational
- [ ] Rate limiting active
- [ ] Resource limits enforced
- [ ] Security headers configured
- [ ] Secrets removed from git
- [ ] Documentation updated
- [ ] Deployment guide created

### Security Validation

- [ ] No secrets in git history
- [ ] Strong JWT_SECRET configured (32+ chars)
- [ ] Strong APP_PASSWORD configured (16+ chars)
- [ ] SSL certificates valid and secured
- [ ] Docker socket proxied (not direct)
- [ ] Rate limiting prevents brute force
- [ ] Input validation blocks malformed requests
- [ ] Container resources limited
- [ ] Security headers present
- [ ] HTTPS redirects working

### Monitoring Setup

- [ ] Failed login attempts logged
- [ ] Rate limit violations tracked
- [ ] Container resource usage monitored
- [ ] Security events audited
- [ ] Session lifecycle logged

---

## Password Security

### Generating Secure Password Hash

```bash
# One-time setup - Generate password hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-secure-password-here', 10));"
```

### Password Requirements

- **Minimum Length**: 16 characters
- **Complexity**: Mix of uppercase, lowercase, numbers, symbols
- **Rotation**: Quarterly (every 90 days)
- **Storage**: Environment variable only (never in code)

### Example Strong Passwords

```
MyWeb$hell2024!Secure
Termin@l-Access#2024
P@ssw0rd-WebShell-9876!
```

**Recommendation**: Use password manager to generate 20+ character random password

---

## Risk Assessment

### Before Implementation

| Category | Risk Level |
|----------|------------|
| Authentication | 🔴 Critical (9/10) |
| Network Security | 🔴 Critical (10/10) |
| Docker Isolation | 🔴 Critical (9/10) |
| Input Validation | 🟡 High (7/10) |
| Resource Management | 🟡 High (7/10) |
| **Overall** | **🔴 7.5/10** |

### After Implementation

| Category | Target Level |
|----------|--------------|
| Authentication | 🟢 Low (2/10) |
| Network Security | 🟢 Low (2/10) |
| Docker Isolation | 🟢 Low (3/10) |
| Input Validation | 🟢 Low (2/10) |
| Resource Management | 🟢 Low (2/10) |
| **Overall** | **🟢 3.0/10** |

---

## Quick Reference

### Critical Files to Modify

**Backend:**
- `backend/src/config/config.ts` - JWT validation
- `backend/src/services/authService.ts` - Single password auth
- `backend/src/routes/auth.routes.ts` - Login endpoint
- `backend/src/server.ts` - HTTPS, rate limiting, headers
- `backend/src/services/containerManager.ts` - Resource limits
- `docker-compose.yml` - Docker socket proxy

**Frontend:**
- `frontend/src/components/Login.tsx` - Simple password form
- `frontend/src/services/api.ts` - Cookie credentials

**Configuration:**
- `.env.example` - Document required variables
- `.gitignore` - Add certificate and env patterns
- `docker-compose.yml` - Add socket proxy service

### Dependencies to Add

**Backend:**
```bash
npm install express-rate-limit helmet zod winston
```

**New Services (Docker):**
- `tecnativa/docker-socket-proxy` - Socket isolation

---

## Contact & Support

For questions or issues during implementation:
- Refer to detailed audit reports in git history
- Check DEVELOPMENT.md for dev workflow
- Review DOCKER.md for container configuration

**Next Steps**: Begin Phase 1 implementation immediately.
