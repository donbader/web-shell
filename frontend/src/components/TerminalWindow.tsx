import { useEffect, useRef } from 'react';
import { TerminalComponent } from './Terminal';
import './TerminalWindow.css';

interface TerminalWindowProps {
  windowId: string;
  title: string;
  isActive: boolean;
  wsUrl: string;
  shell?: string;
  environment?: string;
  onTitleChange?: (title: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  onSessionEnded?: () => void;
}

export function TerminalWindow({
  windowId,
  title,
  isActive,
  wsUrl,
  shell,
  environment,
  onTitleChange,
  onSessionCreated,
  onSessionEnded,
}: TerminalWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Could implement auto title changes based on current directory
    // For now, title is manually managed by WindowManager
  }, [title, onTitleChange]);

  return (
    <div
      ref={containerRef}
      className={`terminal-window ${isActive ? 'active' : 'hidden'}`}
      data-window-id={windowId}
    >
      <TerminalComponent
        wsUrl={wsUrl}
        shell={shell}
        environment={environment}
        onSessionCreated={onSessionCreated}
        onSessionEnded={onSessionEnded}
      />
    </div>
  );
}
