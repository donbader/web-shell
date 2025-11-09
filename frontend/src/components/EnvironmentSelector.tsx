import { useState, useEffect } from 'react';
import { getAllEnvironments } from '../services/environmentService';
import type { EnvironmentMetadata } from '../types/environment';
import './EnvironmentSelector.css';

export interface EnvironmentConfig {
  environment: string;
}

interface EnvironmentSelectorProps {
  onSelect: (config: EnvironmentConfig) => void;
  onCancel: () => void;
}

export function EnvironmentSelector({ onSelect, onCancel }: EnvironmentSelectorProps) {
  const [environment, setEnvironment] = useState<string>('default');
  const [environments, setEnvironments] = useState<EnvironmentMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-discover environments from backend API
    async function loadEnvironments() {
      try {
        const envs = await getAllEnvironments();
        setEnvironments(envs);
        if (envs.length > 0) {
          setEnvironment(envs[0].name); // Default to first environment
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
        // Fallback to hardcoded defaults
        setEnvironments([
          { name: 'default', display: 'Default', icon: '🚀' } as EnvironmentMetadata,
          { name: 'minimal', display: 'Minimal', icon: '⚡' } as EnvironmentMetadata,
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadEnvironments();
  }, []);

  const handleCreate = () => {
    onSelect({ environment });
  };

  if (loading) {
    return (
      <div className="environment-selector-overlay" onClick={onCancel}>
        <div className="environment-selector simple" onClick={(e) => e.stopPropagation()}>
          <h2>New Terminal</h2>
          <p>Loading environments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="environment-selector-overlay" onClick={onCancel}>
      <div className="environment-selector simple" onClick={(e) => e.stopPropagation()}>
        <h2>New Terminal</h2>

        <div className="selector-section">
          <label htmlFor="environment-select">Environment</label>
          <select
            id="environment-select"
            className="environment-dropdown"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            {environments.map((env) => (
              <option key={env.name} value={env.name}>
                {env.icon} {env.display}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-create" onClick={handleCreate}>
            Create Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
