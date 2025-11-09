import logger from './logger.js';

/**
 * Validation utilities for WebSocket messages
 * Prevents injection attacks, DoS, and malicious inputs
 */

// Maximum allowed terminal dimensions
const MAX_COLS = 500;
const MAX_ROWS = 200;
const MIN_COLS = 10;
const MIN_ROWS = 5;

// Maximum input data size (10KB per message)
const MAX_INPUT_SIZE = 10 * 1024;

// Allowed shell types
const ALLOWED_SHELLS = ['bash', 'zsh'];

// Allowed environment types
const ALLOWED_ENVIRONMENTS = ['default', 'minimal'];

/**
 * Validate terminal dimensions (cols/rows)
 */
export function validateTerminalDimensions(
  cols: any,
  rows: any
): { valid: boolean; cols?: number; rows?: number; error?: string } {
  // Check if values exist and are numbers
  if (typeof cols !== 'number' || typeof rows !== 'number') {
    return { valid: false, error: 'Cols and rows must be numbers' };
  }

  // Check if values are integers
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    return { valid: false, error: 'Cols and rows must be integers' };
  }

  // Check bounds
  if (cols < MIN_COLS || cols > MAX_COLS) {
    return {
      valid: false,
      error: `Cols must be between ${MIN_COLS} and ${MAX_COLS}`,
    };
  }

  if (rows < MIN_ROWS || rows > MAX_ROWS) {
    return {
      valid: false,
      error: `Rows must be between ${MIN_ROWS} and ${MAX_ROWS}`,
    };
  }

  return { valid: true, cols, rows };
}

/**
 * Validate shell type
 */
export function validateShell(shell: any): { valid: boolean; shell?: string; error?: string } {
  if (typeof shell !== 'string') {
    return { valid: false, error: 'Shell must be a string' };
  }

  // Normalize to lowercase
  const normalizedShell = shell.toLowerCase().trim();

  if (!ALLOWED_SHELLS.includes(normalizedShell)) {
    return {
      valid: false,
      error: `Shell must be one of: ${ALLOWED_SHELLS.join(', ')}`,
    };
  }

  return { valid: true, shell: normalizedShell };
}

/**
 * Validate environment type
 */
export function validateEnvironment(
  environment: any
): { valid: boolean; environment?: string; error?: string } {
  if (typeof environment !== 'string') {
    return { valid: false, error: 'Environment must be a string' };
  }

  // Normalize to lowercase
  const normalizedEnv = environment.toLowerCase().trim();

  if (!ALLOWED_ENVIRONMENTS.includes(normalizedEnv)) {
    return {
      valid: false,
      error: `Environment must be one of: ${ALLOWED_ENVIRONMENTS.join(', ')}`,
    };
  }

  return { valid: true, environment: normalizedEnv };
}

/**
 * Validate input data size and sanitize
 */
export function validateInputData(data: any): { valid: boolean; data?: string; error?: string } {
  if (typeof data !== 'string') {
    return { valid: false, error: 'Input data must be a string' };
  }

  // Check size limit
  const byteSize = Buffer.byteLength(data, 'utf-8');
  if (byteSize > MAX_INPUT_SIZE) {
    logger.warn('Oversized WebSocket input data rejected', {
      size: byteSize,
      maxSize: MAX_INPUT_SIZE,
    });
    return {
      valid: false,
      error: `Input data exceeds maximum size of ${MAX_INPUT_SIZE} bytes`,
    };
  }

  // Note: We don't sanitize terminal input as it should be passed as-is to the shell
  // The security boundary is the Docker container isolation
  return { valid: true, data };
}

/**
 * Validate WebSocket message structure
 */
export function validateWebSocketMessage(
  msg: any
): { valid: boolean; error?: string } {
  // Check if message is an object
  if (typeof msg !== 'object' || msg === null) {
    return { valid: false, error: 'Message must be a valid object' };
  }

  // Check if type exists and is a string
  if (typeof msg.type !== 'string') {
    return { valid: false, error: 'Message must have a valid type field' };
  }

  return { valid: true };
}

/**
 * Log validation failure with details
 */
export function logValidationFailure(
  messageType: string,
  field: string,
  error: string,
  value: any
): void {
  logger.warn('WebSocket message validation failed', {
    messageType,
    field,
    error,
    valueType: typeof value,
    // Don't log actual value to avoid leaking sensitive data
  });
}
