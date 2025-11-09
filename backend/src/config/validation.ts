/**
 * Environment configuration validation and warnings
 *
 * Validates environment configuration at startup and warns about
 * common misconfigurations, especially in production environments.
 */

import config from './config.js';
import logger from '../utils/logger.js';

/**
 * Validates environment configuration and logs warnings for
 * potentially insecure or misconfigured settings.
 *
 * This function should be called during application startup to
 * catch configuration issues early.
 */
export function validateEnvironment(): void {
  const warnings: string[] = [];
  const isProduction = config.nodeEnv === 'production';

  // Production-specific warnings
  if (isProduction) {
    // Warn about production without HTTPS
    if (!config.useHttps) {
      warnings.push(
        'Production mode without HTTPS is insecure. ' +
        'Set USE_HTTPS=true and configure SSL certificates.'
      );
    }

    // Warn about authentication disabled in production
    if (!config.authEnabled) {
      warnings.push(
        'Authentication is disabled in production mode. ' +
        'This allows unrestricted access. Set AUTH_ENABLED=true.'
      );
    }

    // Warn about default/localhost CORS in production
    const hasLocalhostCors = config.corsOrigins.some(origin =>
      origin.includes('localhost') || origin.includes('127.0.0.1')
    );

    if (hasLocalhostCors) {
      warnings.push(
        'CORS origins include localhost in production. ' +
        'Update CORS_ORIGINS to only include production domains.'
      );
    }

    // Warn about wildcard CORS
    if (config.corsOrigins.includes('*')) {
      warnings.push(
        'CORS origins set to wildcard (*) in production. ' +
        'This is insecure. Specify exact allowed origins.'
      );
    }
  }

  // Development-specific suggestions
  if (!isProduction) {
    // Suggest HTTPS for testing production-like environments
    if (!config.useHttps) {
      logger.info(
        'Development mode using HTTP. ' +
        'To test HTTPS locally, set USE_HTTPS=true and generate self-signed certificates.'
      );
    }
  }

  // Universal warnings (any environment)

  // Warn about very short session expiry
  const expiryMatch = config.sessionExpiry.match(/^(\d+)([hmsd])$/);
  if (expiryMatch) {
    const [, value, unit] = expiryMatch;
    const numValue = parseInt(value, 10);

    if ((unit === 'm' && numValue < 15) || (unit === 'h' && numValue < 1)) {
      warnings.push(
        `Session expiry is very short (${config.sessionExpiry}). ` +
        'Users may experience frequent logouts.'
      );
    }
  }

  // Warn about very high idle timeout
  if (config.idleTimeoutMinutes > 1440) { // > 24 hours
    warnings.push(
      `Idle timeout is very long (${config.idleTimeoutMinutes} minutes). ` +
      'Consider reducing to prevent resource leaks from abandoned sessions.'
    );
  }

  // Warn about very high max sessions
  if (config.maxSessionsPerUser > 20) {
    warnings.push(
      `Max sessions per user is high (${config.maxSessionsPerUser}). ` +
      'This may allow resource exhaustion. Consider reducing the limit.'
    );
  }

  // Log all warnings
  if (warnings.length > 0) {
    logger.warn('⚠️  Environment configuration warnings:');
    warnings.forEach(warning => {
      logger.warn(`   • ${warning}`);
    });
    logger.warn(''); // Empty line for readability
  } else {
    logger.info('✅ Environment configuration validated successfully');
  }
}

/**
 * Logs current configuration (safe subset) for debugging.
 * Excludes sensitive values like JWT secrets.
 */
export function logConfiguration(): void {
  logger.info('Current configuration:');
  logger.info(`  • Environment: ${config.nodeEnv}`);
  logger.info(`  • Port: ${config.port}`);
  logger.info(`  • HTTPS: ${config.useHttps ? 'enabled' : 'disabled'}`);
  logger.info(`  • Authentication: ${config.authEnabled ? 'enabled' : 'disabled'}`);
  logger.info(`  • CORS Origins: ${config.corsOrigins.join(', ')}`);
  logger.info(`  • Session Expiry: ${config.sessionExpiry}`);
  logger.info(`  • Max Sessions/User: ${config.maxSessionsPerUser}`);
  logger.info(`  • Idle Timeout: ${config.idleTimeoutMinutes} minutes`);
  logger.info(`  • Docker Host: ${config.dockerHost}`);
}
