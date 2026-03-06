import { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Sign in to access the admin panel.</p>
        <button
          onClick={login}
          style={{ background: 'var(--accent)', color: '#fff', padding: '8px 20px' }}
        >
          Sign in
        </button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '8px' }}>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Access Denied</p>
        <p style={{ color: 'var(--text-secondary)' }}>Your account is not in the admin group.</p>
      </div>
    );
  }

  return <>{children}</>;
}
