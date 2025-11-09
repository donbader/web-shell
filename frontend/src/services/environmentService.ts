import type { EnvironmentMetadata, EnvironmentComparison } from '../types/environment';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3366';

/**
 * Fetch all available environments
 */
export async function getAllEnvironments(): Promise<EnvironmentMetadata[]> {
  const response = await fetch(`${API_BASE}/api/environments`);
  if (!response.ok) {
    throw new Error('Failed to fetch environments');
  }
  const data = await response.json();
  return data.environments;
}

/**
 * Fetch metadata for a specific environment
 */
export async function getEnvironment(name: string): Promise<EnvironmentMetadata> {
  const response = await fetch(`${API_BASE}/api/environments/${name}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch environment: ${name}`);
  }
  const data = await response.json();
  return data.environment;
}

/**
 * Compare two environments
 */
export async function compareEnvironments(
  env1: string,
  env2: string
): Promise<EnvironmentComparison> {
  const response = await fetch(`${API_BASE}/api/environments/compare/${env1}/${env2}`);
  if (!response.ok) {
    throw new Error(`Failed to compare environments: ${env1} vs ${env2}`);
  }
  const data = await response.json();
  return data.comparison;
}
