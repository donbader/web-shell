# SSL/TLS Deployment Guide

## Overview

This guide explains how to deploy the Web Shell application with HTTPS/WSS (WebSocket Secure) to protect credentials and session tokens from network interception.

## Security Benefits

**HTTPS/WSS Enforcement Prevents:**
- Password interception during login
- JWT token theft via network sniffing
- Man-in-the-middle (MITM) attacks
- Session hijacking
- Credential exposure in plaintext

## Development vs Production

### Development Mode (Default)
```bash
# backend/.env
USE_HTTPS=false
```
- Uses HTTP and WS (unencrypted)
- Suitable for localhost development only
- Displays warning: "INSECURE: Running without HTTPS"

### Production Mode
```bash
# backend/.env
USE_HTTPS=true
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
HTTP_PORT=80
```
- Enforces HTTPS and WSS
- Automatically redirects HTTP → HTTPS
- Sets secure cookie flags
- Requires valid SSL certificates

## SSL Certificate Options

### Option 1: Self-Signed Certificates (Testing Only)

**Generate self-signed certificates:**
```bash
# Create certs directory
mkdir -p backend/certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/certs/key.pem \
  -out backend/certs/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**Warning:** Self-signed certificates trigger browser warnings and are NOT suitable for production use.

### Option 2: Let's Encrypt (Free Production Certificates)

**Using Certbot:**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate for your domain
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be created at:
# /etc/letsencrypt/live/your-domain.com/privkey.pem
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
```

**Configure environment:**
```bash
USE_HTTPS=true
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
```

**Auto-renewal:**
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal (runs daily)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && systemctl restart web-shell-backend
```

### Option 3: Commercial SSL Certificate

Purchase from providers like:
- DigiCert
- Sectigo
- GoDaddy
- Namecheap

Follow provider's instructions for CSR generation and certificate installation.

## Deployment Methods

### Method 1: Direct HTTPS (Node.js Handles SSL)

**Configuration:**
```bash
# backend/.env
USE_HTTPS=true
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_CERT_PATH=/etc/ssl/certs/server.crt
PORT=443
HTTP_PORT=80
```

**Docker Compose:**
```yaml
backend:
  ports:
    - "443:443"  # HTTPS
    - "80:80"    # HTTP redirect
  environment:
    - USE_HTTPS=true
    - PORT=443
  volumes:
    - /etc/ssl:/app/certs:ro
```

**Pros:**
- Simple setup
- No additional software

**Cons:**
- Requires privileged ports (80, 443)
- Certificate management in application

### Method 2: Reverse Proxy with SSL Termination (Recommended)

Use nginx, Traefik, or Caddy to handle SSL termination.

#### Nginx Example

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://localhost:3377;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3366;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3366;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Backend configuration with proxy:**
```bash
# Backend runs on HTTP (nginx handles HTTPS)
USE_HTTPS=false
PORT=3366
```

#### Traefik Example

**docker-compose.yml with Traefik:**
```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@your-domain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=3366"
      # HTTP to HTTPS redirect
      - "traefik.http.routers.backend-http.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.backend-http.entrypoints=web"
      - "traefik.http.routers.backend-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
```

**Pros:**
- Automatic certificate management
- No application-level SSL handling
- Easier certificate renewal
- Can handle multiple domains

**Cons:**
- Additional component to manage
- Slightly more complex setup

## Environment Variables

### Backend (.env)

```bash
# HTTPS Configuration
USE_HTTPS=true                           # Enable HTTPS mode
SSL_KEY_PATH=/etc/ssl/private/server.key # Path to private key
SSL_CERT_PATH=/etc/ssl/certs/server.crt  # Path to certificate
HTTP_PORT=80                             # Port for HTTP→HTTPS redirect

# Server Configuration
PORT=443                                 # HTTPS port
NODE_ENV=production                      # Enable production mode

# CORS (must match frontend URL)
CORS_ORIGINS=https://your-domain.com

# JWT Secret (REQUIRED in production)
JWT_SECRET=your-secure-random-secret-minimum-32-chars

# Authentication
AUTH_ENABLED=true
```

### Frontend (.env)

```bash
# Production URLs (HTTPS/WSS)
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

## Docker Deployment

### With SSL Certificates Mounted

```yaml
backend:
  environment:
    - USE_HTTPS=true
    - SSL_KEY_PATH=/app/certs/privkey.pem
    - SSL_CERT_PATH=/app/certs/fullchain.pem
    - PORT=443
  ports:
    - "443:443"
    - "80:80"
  volumes:
    - /etc/letsencrypt/live/your-domain.com:/app/certs:ro
```

### With Reverse Proxy (Recommended)

```yaml
backend:
  environment:
    - USE_HTTPS=false  # Proxy handles SSL
    - PORT=3366
  # No external ports - only accessible via proxy
```

## Security Best Practices

### 1. Strong Cipher Suites
If using direct HTTPS mode, Node.js defaults are secure. For nginx:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;
```

### 2. HTTP Strict Transport Security (HSTS)
Add to nginx:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Certificate Security
```bash
# Restrict key file permissions
chmod 600 /etc/ssl/private/server.key
chown root:root /etc/ssl/private/server.key

# Certificate can be readable
chmod 644 /etc/ssl/certs/server.crt
```

### 4. Regular Updates
- Keep certificates renewed (Let's Encrypt expires every 90 days)
- Update TLS libraries regularly
- Monitor for security advisories

## Testing HTTPS Setup

### 1. Certificate Validation
```bash
# Check certificate details
openssl x509 -in /path/to/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

### 2. Browser Testing
1. Navigate to `https://your-domain.com`
2. Check for padlock icon in address bar
3. Click padlock → View certificate details
4. Verify certificate is valid and trusted

### 3. WebSocket Testing
Open browser console:
```javascript
const ws = new WebSocket('wss://your-domain.com');
ws.onopen = () => console.log('WSS connected');
ws.onerror = (err) => console.error('WSS error:', err);
```

### 4. SSL Labs Test
For production deployments, test with:
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

## Troubleshooting

### Certificate Errors

**Problem:** "Failed to load SSL certificates"
```
Solution:
1. Verify file paths in .env
2. Check file permissions (key must be readable by app)
3. Ensure certificates exist and are valid
4. Check certificate format (PEM format required)
```

**Problem:** Browser shows "Your connection is not private"
```
Solution:
1. For self-signed: Expected, click "Advanced" → "Proceed"
2. For production: Certificate may be expired or invalid
3. Check certificate domain matches URL
4. Verify certificate chain is complete
```

### WebSocket Connection Fails

**Problem:** WebSocket fails to connect over WSS
```
Solution:
1. Verify frontend uses wss:// not ws://
2. Check proxy WebSocket headers (Upgrade, Connection)
3. Ensure reverse proxy forwards WebSocket correctly
4. Check firewall rules allow WSS connections
```

### HTTP Redirect Not Working

**Problem:** HTTP requests don't redirect to HTTPS
```
Solution:
1. Verify HTTP_PORT is exposed (default 80)
2. Check USE_HTTPS=true in production
3. Ensure port 80 is not blocked by firewall
4. If using proxy, configure redirect at proxy level
```

## Production Checklist

- [ ] Valid SSL certificate installed (Let's Encrypt or commercial)
- [ ] `USE_HTTPS=true` in backend environment
- [ ] `JWT_SECRET` set to secure random value (32+ characters)
- [ ] Frontend configured with `https://` and `wss://` URLs
- [ ] Certificate auto-renewal configured
- [ ] HTTP → HTTPS redirect enabled
- [ ] Secure cookie flags enabled (automatic in HTTPS mode)
- [ ] Firewall allows ports 80 and 443
- [ ] Certificate permissions properly restricted
- [ ] SSL Labs test passed with A rating (if using reverse proxy)
- [ ] WebSocket connections working over WSS
- [ ] CORS origins updated to HTTPS URLs

## Certificate Renewal

### Let's Encrypt Auto-Renewal

**Check renewal status:**
```bash
sudo certbot certificates
```

**Test renewal:**
```bash
sudo certbot renew --dry-run
```

**Force renewal:**
```bash
sudo certbot renew --force-renewal
```

**Restart application after renewal:**
```bash
# Docker
docker-compose restart backend

# SystemD
sudo systemctl restart web-shell-backend

# PM2
pm2 restart web-shell-backend
```

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)
- [OWASP Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

## Support

For issues or questions about SSL/TLS configuration:
1. Check application logs for specific error messages
2. Verify certificate validity with `openssl` commands
3. Test with SSL Labs for production deployments
4. Consult reverse proxy documentation for proxy-specific issues
