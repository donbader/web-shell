import { WindowManager } from './components/WindowManager';
import './App.css';

// Construct WebSocket URL dynamically based on current host
// This ensures it works whether accessing via localhost, IP, or domain
const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes port if present
  const basePath = '/corey-private-router/web-shell-api';

  return `${protocol}//${host}${basePath}`;
};

const WS_URL = getWebSocketUrl();

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🖥️ Web Shell</h1>
        <p>Browser-based Terminal - Multi-Window</p>
      </header>
      <main className="app-main">
        <WindowManager wsUrl={WS_URL} />
      </main>
    </div>
  );
}

export default App;
