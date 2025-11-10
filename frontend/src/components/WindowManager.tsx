import { useState, useEffect, useCallback } from 'react';
import { TerminalWindow } from './TerminalWindow';
import { EnvironmentSelector } from './EnvironmentSelector';
import { ImageBuildModal } from './ImageBuildModal';
import type { EnvironmentConfig } from './EnvironmentSelector';
import { generateUUID } from '../utils/uuid';
import { ensureImage } from '../services/imageService';
import type { BuildProgress } from '../services/imageService';
import { Button } from '@/components/ui/button';
import { Plus, X, Zap, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'web-shell-windows';

interface TerminalWindowData {
  id: string;
  title: string;
  createdAt: number;
  shell?: string;
  environment?: string;
  sessionId?: string; // Track backend session ID
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
        const parsed = JSON.parse(stored);
        // Migrate old data: ensure all windows have shell and environment
        if (parsed.windows) {
          parsed.windows = parsed.windows.map((w: TerminalWindowData) => ({
            ...w,
            shell: w.shell || 'zsh', // Default to zsh if missing
            environment: w.environment || 'default', // Default to default if missing
          }));
        }
        return parsed;
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
          console.error(`Error ensuring image for ${env}:`, error);
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

  const updateWindowTitle = useCallback((id: string, title: string) => {
    setState(prev => ({
      ...prev,
      windows: prev.windows.map(w =>
        w.id === id ? { ...w, title } : w
      ),
    }));
  }, []);

  const updateWindowSessionId = useCallback((id: string, sessionId: string) => {
    setState(prev => ({
      ...prev,
      windows: prev.windows.map(w =>
        w.id === id ? { ...w, sessionId } : w
      ),
    }));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Bar - Mobile Responsive */}
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b bg-muted/30 overflow-x-auto flex-shrink-0">
        {/* Tabs Container - Scrollable on mobile */}
        <div className="flex gap-1 sm:gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
          {state.windows.map(window => (
            <button
              key={window.id}
              onClick={() => setActiveWindow(window.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                "hover:bg-accent hover:text-accent-foreground",
                state.activeWindowId === window.id
                  ? "bg-background text-foreground shadow-sm border"
                  : "text-muted-foreground"
              )}
            >
              <span className="truncate max-w-[80px] sm:max-w-[120px]">
                {window.title}
              </span>
              {window.sessionId && (
                <span className="flex-shrink-0 text-[10px] text-muted-foreground font-mono" title={`Session: ${window.sessionId}`}>
                  {window.sessionId.substring(0, 6)}
                </span>
              )}
              {window.environment && (
                <span className="flex-shrink-0" title={window.environment}>
                  {window.environment === 'minimal' ? <Zap className="h-3 w-3" /> : <Rocket className="h-3 w-3" />}
                </span>
              )}
              {state.windows.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(window.id);
                  }}
                  className="flex-shrink-0 ml-1 hover:text-destructive transition-colors"
                  aria-label="Close terminal"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
        </div>

        {/* Add Terminal Button */}
        <Button
          onClick={addWindow}
          size="sm"
          variant="outline"
          className="flex-shrink-0 gap-1.5"
          aria-label="New terminal"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 relative overflow-hidden min-h-0">
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
            onSessionCreated={(sessionId) => updateWindowSessionId(window.id, sessionId)}
            onSessionEnded={() => closeWindow(window.id)}
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
