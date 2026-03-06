import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>404</p>
      <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
      <Link to="/" style={{ color: 'var(--accent)', fontSize: '13px' }}>Go home</Link>
    </div>
  );
}
