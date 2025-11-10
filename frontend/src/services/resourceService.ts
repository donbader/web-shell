import { getApiUrl } from '../utils/apiUrl.js';
import type { SystemStats, SessionsResponse, TerminateSessionResponse } from '../types/resources.js';

const API_URL = getApiUrl();

/**
 * Fetch current system resource statistics
 */
export async function getResourceStats(): Promise<SystemStats> {
  const response = await fetch(`${API_URL}/api/resources/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch resource stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch resource summary as text
 */
export async function getResourceSummary(): Promise<string> {
  const response = await fetch(`${API_URL}/api/resources/summary`);

  if (!response.ok) {
    throw new Error(`Failed to fetch resource summary: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Fetch historical resource statistics
 */
export async function getHistoricalStats(minutes: number = 60): Promise<SystemStats[]> {
  const response = await fetch(`${API_URL}/api/resources/historical?minutes=${minutes}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch historical stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all active sessions with metadata
 */
export async function getSessions(): Promise<SessionsResponse> {
  const response = await fetch(`${API_URL}/api/resources/sessions`);

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Terminate a specific terminal session
 * @param sessionId - Session identifier to terminate
 * @returns Termination result with metadata
 */
export async function terminateSession(sessionId: string): Promise<TerminateSessionResponse> {
  const response = await fetch(`${API_URL}/api/resources/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `Failed to terminate session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Terminate an orphaned container by container ID
 * @param containerId - Docker container identifier
 * @returns Termination result
 */
export async function terminateOrphanedContainer(containerId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/resources/orphaned/${containerId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || errorData.message || `Failed to terminate orphaned container: ${response.statusText}`);
  }

  return response.json();
}


/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercent(percent: number): string {
  return percent.toFixed(1) + '%';
}

/**
 * Get color class based on usage percentage
 */
export function getUsageColor(percent: number): string {
  if (percent >= 90) return 'text-red-500';
  if (percent >= 75) return 'text-orange-500';
  if (percent >= 50) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get progress bar variant based on usage percentage
 */
export function getProgressVariant(percent: number): 'default' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'default';
}
