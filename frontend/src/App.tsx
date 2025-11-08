import { TerminalComponent } from './components/Terminal';
import './App.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🖥️ Web Shell</h1>
        <p>Browser-based Terminal</p>
      </header>
      <main className="app-main">
        <TerminalComponent wsUrl={WS_URL} />
      </main>
    </div>
  );
}

export default App;
