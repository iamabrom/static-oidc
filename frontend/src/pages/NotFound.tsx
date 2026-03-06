import { Link } from 'react-router-dom';

export function NotFound({ path }: { path?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '8px' }}>
      <p style={{ fontWeight: 700, fontSize: '24px', color: 'var(--text-primary)' }}>404.</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        {path
          ? <><code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '4px', fontSize: '13px' }}>{path}</code> was not found.</>
          : 'Page not found.'}
      </p>
      {/* <Link to="/" style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '4px' }}>Go home</Link> */}
    </div>
  );
}
