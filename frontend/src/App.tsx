import { useState, useEffect } from 'react';
import { WindowManager } from './components/WindowManager';
import { Login } from './components/Login';
import { getApiUrl, getWebSocketUrl } from './utils/apiUrl';
import { Button } from '@/components/ui/button';
import { Terminal, LogOut, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (AUTH_ENABLED && !isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header - Mobile Responsive */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-2 flex-1">
            <Terminal className="h-5 w-5 text-primary hidden sm:block" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Web Shell</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Multi-Window Terminal
              </p>
            </div>
          </div>
          {AUTH_ENABLED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col flex-1 overflow-hidden">
        <WindowManager wsUrl={WS_URL} />
      </main>
    </div>
  );
}

export default App;
