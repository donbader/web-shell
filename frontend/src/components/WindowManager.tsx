import { useState, useEffect } from 'react';
import { TerminalWindow } from './TerminalWindow';
import { EnvironmentSelector } from './EnvironmentSelector';
import { ImageBuildModal } from './ImageBuildModal';
import type { EnvironmentConfig } from './EnvironmentSelector';
import { generateUUID } from '../utils/uuid';
import { ensureImage } from '../services/imageService';
import type { BuildProgress } from '../services/imageService';
import './WindowManager.css';

const STORAGE_KEY = 'web-shell-windows';

interface TerminalWindowData {
  id: string;
  title: string;
  createdAt: number;
  shell?: string;
  environment?: string;
}

interface WindowManagerState {
  windows: TerminalWindowData[];
  activeWindowId: string | null;
}

interface WindowManagerProps {
  wsUrl: string;
}

export function WindowManager({ wsUrl }: WindowManagerProps) {
  const [showEnvironmentSelector, setShowEnvironmentSelector] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildEnvironment, setBuildEnvironment] = useState<string>('');
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  const [state, setState] = useState<WindowManagerState>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored window state:', e);
      }
    }

    // Default: single terminal with default zsh shell
    const defaultWindow: TerminalWindowData = {
      id: generateUUID(),
      title: 'Terminal 1',
      createdAt: Date.now(),
      shell: 'zsh',
      environment: 'default',
    };

    return {
      windows: [defaultWindow],
      activeWindowId: defaultWindow.id,
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check and build images for existing terminals on mount
  useEffect(() => {
    const checkExistingImages = async () => {
      // Get unique environments from existing windows
      const environments = new Set(
        state.windows.map(w => w.environment || 'default')
      );

      // Check and build each environment
      for (const env of environments) {
        try {
          await ensureImage(env, (progress) => {
            if (progress.status === 'building' || progress.status === 'starting') {
              setBuildEnvironment(env);
              setBuildProgress(progress);
              setShowBuildModal(true);
            } else if (progress.status === 'completed') {
              setTimeout(() => {
                setShowBuildModal(false);
                setBuildProgress(null);
              }, 1500);
            } else if (progress.status === 'error') {
              setBuildProgress(progress);
            }
          });
        } catch (error) {
          console.error(`[WindowManager] Error ensuring image for ${env}:`, error);
        }
      }

      // All images are ready, allow terminals to render
      setImagesReady(true);
    };

    checkExistingImages();
  }, []); // Run only on mount

  const addWindow = () => {
    setShowEnvironmentSelector(true);
  };

  const createWindowWithConfig = async (config: EnvironmentConfig) => {
    const environment = config.environment || 'default';

    // Check if image exists, build if necessary
    try {
      setShowEnvironmentSelector(false);
      setBuildEnvironment(environment);
      setShowBuildModal(true);

      // Ensure image exists, building if necessary
      await ensureImage(environment, (progress) => {
        setBuildProgress(progress);

        // Auto-close modal and create window when build completes
        if (progress.status === 'completed') {
          setTimeout(() => {
            setShowBuildModal(false);
            setBuildProgress(null);
            actuallyCreateWindow(config);
          }, 1500); // Give user time to see success message
        }
      });

      // If image already existed (no build needed), create window immediately
      if (!buildProgress || buildProgress.status === 'completed') {
        setShowBuildModal(false);
        setBuildProgress(null);
        actuallyCreateWindow(config);
      }
    } catch (error) {
      console.error('[WindowManager] Error ensuring image:', error);
      setBuildProgress({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to prepare image',
      });
    }
  };

  const actuallyCreateWindow = (config: EnvironmentConfig) => {
    const newWindow: TerminalWindowData = {
      id: generateUUID(),
      title: `Terminal ${state.windows.length + 1}`,
      createdAt: Date.now(),
      shell: 'zsh', // Default to zsh (can be changed by user in terminal)
      environment: config.environment,
    };

    setState(prev => ({
      windows: [...prev.windows, newWindow],
      activeWindowId: newWindow.id,
    }));
  };

  const closeBuildModal = () => {
    setShowBuildModal(false);
    setBuildProgress(null);
    setBuildEnvironment('');
  };

  const closeWindow = (id: string) => {
    setState(prev => {
      const newWindows = prev.windows.filter(w => w.id !== id);

      // If closing active window, switch to another
      let newActiveId = prev.activeWindowId;
      if (prev.activeWindowId === id && newWindows.length > 0) {
        newActiveId = newWindows[newWindows.length - 1].id;
      }

      return {
        windows: newWindows,
        activeWindowId: newActiveId,
      };
    });
  };

  const setActiveWindow = (id: string) => {
    setState(prev => ({
      ...prev,
      activeWindowId: id,
    }));
  };

  const updateWindowTitle = (id: string, title: string) => {
    setState(prev => ({
      ...prev,
      windows: prev.windows.map(w =>
        w.id === id ? { ...w, title } : w
      ),
    }));
  };

  return (
    <div className="window-manager">
      <div className="tab-bar">
        <div className="tabs">
          {state.windows.map(window => (
            <div
              key={window.id}
              className={`tab ${state.activeWindowId === window.id ? 'active' : ''}`}
              onClick={() => setActiveWindow(window.id)}
            >
              <span className="tab-title">{window.title}</span>
              {window.environment && (
                <span className={`tab-env-badge ${window.environment}`}>
                  {window.environment === 'minimal' ? '⚡' : '🚀'}
                </span>
              )}
              {state.windows.length > 1 && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(window.id);
                  }}
                  aria-label="Close terminal"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          className="add-terminal-btn"
          onClick={addWindow}
          aria-label="New terminal"
          title="New terminal"
        >
          + New Terminal
        </button>
      </div>

      <div className="terminal-container">
        {imagesReady && state.windows.map(window => (
          <TerminalWindow
            key={window.id}
            windowId={window.id}
            title={window.title}
            isActive={state.activeWindowId === window.id}
            wsUrl={wsUrl}
            shell={window.shell}
            environment={window.environment}
            onTitleChange={(title) => updateWindowTitle(window.id, title)}
          />
        ))}
      </div>

      {showEnvironmentSelector && (
        <EnvironmentSelector
          onSelect={createWindowWithConfig}
          onCancel={() => setShowEnvironmentSelector(false)}
        />
      )}

      <ImageBuildModal
        environment={buildEnvironment}
        isOpen={showBuildModal}
        progress={buildProgress}
        onClose={closeBuildModal}
      />
    </div>
  );
}
