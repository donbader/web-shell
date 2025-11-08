import { useState, useEffect } from 'react';
import { TerminalWindow } from './TerminalWindow';
import { generateUUID } from '../utils/uuid';
import './WindowManager.css';

const STORAGE_KEY = 'web-shell-windows';

interface TerminalWindowData {
  id: string;
  title: string;
  createdAt: number;
}

interface WindowManagerState {
  windows: TerminalWindowData[];
  activeWindowId: string | null;
}

interface WindowManagerProps {
  wsUrl: string;
}

export function WindowManager({ wsUrl }: WindowManagerProps) {
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

    // Default: single terminal
    const defaultWindow: TerminalWindowData = {
      id: generateUUID(),
      title: 'Terminal 1',
      createdAt: Date.now(),
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

  const addWindow = () => {
    const newWindow: TerminalWindowData = {
      id: generateUUID(),
      title: `Terminal ${state.windows.length + 1}`,
      createdAt: Date.now(),
    };

    setState(prev => ({
      windows: [...prev.windows, newWindow],
      activeWindowId: newWindow.id,
    }));
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
        {state.windows.map(window => (
          <TerminalWindow
            key={window.id}
            windowId={window.id}
            title={window.title}
            isActive={state.activeWindowId === window.id}
            wsUrl={wsUrl}
            onTitleChange={(title) => updateWindowTitle(window.id, title)}
          />
        ))}
      </div>
    </div>
  );
}
