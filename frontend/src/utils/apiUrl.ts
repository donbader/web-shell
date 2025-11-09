/**
 * Shared utility for getting API URL
 * Uses environment variable if provided (development)
 * Otherwise constructs dynamically from window.location (production with reverse proxy)
 */
export function getApiUrl(): string {
  // Use environment variable if provided (development)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Otherwise construct dynamically (production with reverse proxy)
  const protocol = window.location.protocol;
  const host = window.location.host;
  const basePath = '/corey-private-router/web-shell-api';
  return `${protocol}//${host}${basePath}`;
}

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl(): string {
  // Use environment variable if provided (development)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Otherwise construct dynamically (production with reverse proxy)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const basePath = '/corey-private-router/web-shell-api';
  return `${protocol}//${host}${basePath}`;
}
