import { WindowManager } from './components/WindowManager';
import './App.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

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
