import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AppConfig {
  appUrl: string;
  oidcClientId: string;
  appName: string;
}

interface AuthState {
  user: User | null;
  config: AppConfig | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { user: User };
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const login = async () => {
    const res = await fetch('/api/auth/login', { credentials: 'include' });
    const data = await res.json() as { url: string };
    window.location.href = data.url;
  };

  const logout = async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json() as { logoutUrl: string };
    setUser(null);
    window.location.href = data.logoutUrl;
  };

  useEffect(() => {
    // Fetch config and auth state in parallel on app load
    Promise.all([
      fetch('/api/config').then(r => r.json()) as Promise<AppConfig>,
      checkAuth(),
    ])
      .then(([cfg]) => { setConfig(cfg); document.title = cfg.appName; })
      .catch(err => console.error('Failed to load app config:', err))
      .finally(() => setLoading(false));
  }, []);

  // Block rendering until config is available — nothing in the app can work without it
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--danger)' }}>
        Failed to load configuration. Check that the backend is running.
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, config, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
