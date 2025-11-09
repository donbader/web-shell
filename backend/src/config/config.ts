import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  authEnabled: boolean;
  corsOrigins: string[];
  sessionExpiry: string;
  maxSessionsPerUser: number;
  idleTimeoutMinutes: number;
  jwtSecret: string;
  useHttps: boolean;
  sslKeyPath: string;
  sslCertPath: string;
  httpPort: number;
  dockerHost: string;
}

/**
 * Validates JWT secret configuration to prevent security vulnerabilities.
 * Enforces strict requirements in production:
 * - JWT_SECRET must be set
 * - Minimum length of 32 characters
 * - Cannot use default development secret
 */
function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // Fail fast in production if JWT_SECRET not configured
  if (isProduction && !secret) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set in production. ' +
      'Generate a secure secret with: openssl rand -base64 32'
    );
  }

  // Enforce minimum secret length to prevent weak secrets
  if (secret && secret.length < 32) {
    throw new Error(
      `CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long (current: ${secret.length}). ` +
      'Generate a secure secret with: openssl rand -base64 32'
    );
  }

  // Prevent using default development secret in production
  if (secret === 'development-secret-key-change-in-production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET is using the default development value. ' +
      'This is insecure. Generate a new secret with: openssl rand -base64 32'
    );
  }
}

// Validate JWT secret before creating config
validateJwtSecret();

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  authEnabled: process.env.AUTH_ENABLED === 'true',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  sessionExpiry: process.env.SESSION_EXPIRY || '24h',
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5', 10),
  idleTimeoutMinutes: parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30', 10),
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
  useHttps: process.env.USE_HTTPS === 'true',
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/key.pem',
  sslCertPath: process.env.SSL_CERT_PATH || './certs/cert.pem',
  httpPort: parseInt(process.env.HTTP_PORT || '80', 10),
  dockerHost: process.env.DOCKER_HOST || '/var/run/docker.sock',
};

export default config;
