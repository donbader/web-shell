import { useState } from 'react';
import './EnvironmentSelector.css';

export interface EnvironmentConfig {
  shell: 'zsh' | 'bash';
  environment: 'default' | 'minimal';
}

interface EnvironmentSelectorProps {
  onSelect: (config: EnvironmentConfig) => void;
  onCancel: () => void;
}

export function EnvironmentSelector({ onSelect, onCancel }: EnvironmentSelectorProps) {
  const [shell, setShell] = useState<'zsh' | 'bash'>('zsh');
  const [environment, setEnvironment] = useState<'default' | 'minimal'>('default');

  const handleCreate = () => {
    onSelect({ shell, environment });
  };

  return (
    <div className="environment-selector-overlay" onClick={onCancel}>
      <div className="environment-selector" onClick={(e) => e.stopPropagation()}>
        <h2>New Terminal</h2>

        <div className="selector-section">
          <label>Shell</label>
          <div className="selector-options">
            <button
              className={`selector-option ${shell === 'zsh' ? 'selected' : ''}`}
              onClick={() => setShell('zsh')}
            >
              <div className="option-icon">🐚</div>
              <div className="option-label">Zsh</div>
              <div className="option-desc">Modern shell with plugins</div>
            </button>
            <button
              className={`selector-option ${shell === 'bash' ? 'selected' : ''}`}
              onClick={() => setShell('bash')}
            >
              <div className="option-icon">💻</div>
              <div className="option-label">Bash</div>
              <div className="option-desc">Classic Bourne Again Shell</div>
            </button>
          </div>
        </div>

        <div className="selector-section">
          <label>Environment</label>
          <div className="selector-options">
            <button
              className={`selector-option ${environment === 'default' ? 'selected' : ''}`}
              onClick={() => setEnvironment('default')}
            >
              <div className="option-icon">🚀</div>
              <div className="option-label">Default</div>
              <div className="option-desc">Full-featured with tools & plugins</div>
            </button>
            <button
              className={`selector-option ${environment === 'minimal' ? 'selected' : ''}`}
              onClick={() => setEnvironment('minimal')}
            >
              <div className="option-icon">⚡</div>
              <div className="option-label">Minimal</div>
              <div className="option-desc">Lightweight & fast</div>
            </button>
          </div>
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
