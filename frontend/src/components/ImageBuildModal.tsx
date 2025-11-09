import { useEffect, useState } from 'react';
import type { BuildProgress } from '../services/imageService';
import './ImageBuildModal.css';

interface ImageBuildModalProps {
  environment: string;
  isOpen: boolean;
  progress: BuildProgress | null;
  onClose: () => void;
}

export function ImageBuildModal({
  environment,
  isOpen,
  progress,
  onClose,
}: ImageBuildModalProps) {
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  useEffect(() => {
    if (progress?.stream) {
      setBuildLogs((prev) => [...prev, progress.stream!]);
    }
  }, [progress]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Building Terminal Image</h2>
          <p className="environment-name">{environment}</p>
        </div>

        <div className="modal-body">
          {progress?.status === 'starting' && (
            <div className="status-message">
              <div className="spinner"></div>
              <p>Preparing build...</p>
            </div>
          )}

          {progress?.status === 'building' && (
            <div className="build-progress">
              <div className="status-message">
                <div className="spinner"></div>
                <p>Building image...</p>
              </div>
              <div className="build-logs">
                {buildLogs.slice(-20).map((log, idx) => (
                  <div key={idx} className="log-line">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress?.status === 'completed' && (
            <div className="status-message success">
              <div className="checkmark">✓</div>
              <p>Build completed successfully!</p>
              <button className="primary-button" onClick={onClose}>
                Continue
              </button>
            </div>
          )}

          {progress?.status === 'error' && (
            <div className="status-message error">
              <div className="error-icon">✗</div>
              <p>Build failed</p>
              <p className="error-details">{progress.error}</p>
              <button className="secondary-button" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
