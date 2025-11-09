import { useState, useEffect } from 'react';
import { WindowManager } from './components/WindowManager';
import { Login } from './components/Login';
import './App.css';

// Get API and WebSocket URLs from environment variables
// Falls back to dynamic construction for production reverse proxy setup
const getApiUrl = (): string => {
  // Use environment variable if provided (development)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Otherwise construct dynamically (production with reverse proxy)
  const protocol = window.location.protocol;
  const host = window.location.host;
  const basePath = '/corey-private-router/web-shell-api';
  return `${protocol}//${host}${basePath}`;
};

const getWebSocketUrl = (): string => {
  // Use environment variable if provided (development)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Otherwise construct dynamically (production with reverse proxy)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
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
