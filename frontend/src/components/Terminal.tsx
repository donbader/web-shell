import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { WebSocketService } from '../services/websocket';

interface TerminalComponentProps {
  wsUrl: string;
  shell?: string;
  environment?: string;
}

export function TerminalComponent({ wsUrl, shell, environment }: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      lineHeight: 1.2,
      fontFamily: '"Hack Nerd Font Mono", "Hack Nerd Font", "Cascadia Code", "Fira Code", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      allowTransparency: false,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal
    terminal.open(terminalRef.current);

    // Fit terminal after a brief delay to ensure DOM is ready
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Create WebSocket service
    const wsService = new WebSocketService(wsUrl, shell, environment);
    wsServiceRef.current = wsService;

    // Terminal input handler
    terminal.onData((data) => {
      wsService.sendInput(data);
    });

    // WebSocket event handlers
    wsService.onData((data) => {
      terminal.write(data);
    });

    wsService.onSessionCreated((sessionId) => {
      console.log('Terminal session created:', sessionId);
    });

    wsService.onError((error) => {
      terminal.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
    });

    wsService.onClose(() => {
      terminal.writeln('\r\n\x1b[33mConnection closed. Please refresh the page.\x1b[0m\r\n');
    });

    // Connect to backend
    terminal.writeln('\x1b[36mConnecting to server...\x1b[0m\r\n');
    wsService.connect().catch((error) => {
      terminal.writeln(`\r\n\x1b[31mFailed to connect: ${error.message}\x1b[0m\r\n`);
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon && terminal) {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && wsService.isConnected()) {
          wsService.resize(dims.cols, dims.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      wsService.ping();
    }, 30000); // Ping every 30 seconds

    // Handle browser window/tab close
    const handleBeforeUnload = () => {
      wsService.close();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Handle page visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from this tab
        // The backend will automatically cleanup idle sessions after IDLE_TIMEOUT_MINUTES
        console.log('[Terminal] Tab hidden, session will be cleaned up if idle too long');
      } else {
        // User came back to this tab
        // Ping to show activity
        if (wsService.isConnected()) {
          wsService.ping();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pingInterval);
      wsService.close();
      terminal.dispose();
    };
  }, [wsUrl, shell, environment]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        padding: '10px',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
}
