import { useState, useEffect } from 'react';
import type { EnvironmentMetadata } from '../types/environment';
import { getEnvironment } from '../services/environmentService';
import './EnvironmentInfo.css';

interface EnvironmentInfoProps {
  environmentName: string;
}

export function EnvironmentInfo({ environmentName }: EnvironmentInfoProps) {
  const [environment, setEnvironment] = useState<EnvironmentMetadata | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnvironment() {
      try {
        setLoading(true);
        const data = await getEnvironment(environmentName);
        setEnvironment(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch environment:', err);
        setError('Failed to load environment info');
      } finally {
        setLoading(false);
      }
    }

    fetchEnvironment();
  }, [environmentName]);

  if (loading) {
    return <div className="environment-info loading">Loading...</div>;
  }

  if (error || !environment) {
    return <div className="environment-info error">{error || 'Unknown environment'}</div>;
  }

  return (
    <div className="environment-info">
      <div className="environment-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="env-icon">{environment.icon}</span>
        <span className="env-name">{environment.display}</span>
        <span className="env-badges">
          <span className="badge size">{environment.imageSize}</span>
          <span className="badge packages">{environment.packages.length} packages</span>
          <span className="badge boot">{environment.bootTime}</span>
        </span>
        <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="environment-details">
          <div className="detail-section">
            <h4>Features</h4>
            <ul>
              {environment.features.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>
          </div>

          <div className="detail-section">
            <h4>Installed Packages</h4>
            <div className="package-grid">
              {environment.packages.map((pkg, idx) => (
                <span key={idx} className="package-tag">
                  {pkg}
                </span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>Recommended For</h4>
            <ul>
              {environment.recommendedFor.map((use, idx) => (
                <li key={idx}>• {use}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
