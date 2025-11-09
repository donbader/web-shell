import { useState, useEffect } from 'react';
import { WindowManager } from './components/WindowManager';
import { Login } from './components/Login';
import './App.css';

// Construct API URL dynamically based on current host
// This ensures it works whether accessing via localhost, IP, or domain
const getApiUrl = (): string => {
  const protocol = window.location.protocol; // http: or https:
  const host = window.location.host; // includes port if present
  const basePath = '/corey-private-router/web-shell-api';

  return `${protocol}//${host}${basePath}`;
};

// Construct WebSocket URL dynamically based on current host
// This ensures it works whether accessing via localhost, IP, or domain
const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes port if present
  const basePath = '/corey-private-router/web-shell-api';

  return `${protocol}//${host}${basePath}`;
};

const API_URL = getApiUrl();
const WS_URL = getWebSocketUrl();

// Check if authentication is enabled
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      if (!AUTH_ENABLED) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('auth_token');

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (AUTH_ENABLED && !isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>🖥️ Web Shell</h1>
          <p>Browser-based Terminal - Multi-Window</p>
        </div>
        {AUTH_ENABLED && (
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>
      <main className="app-main">
        <WindowManager wsUrl={WS_URL} />
      </main>
    </div>
  );
}

export default App;
