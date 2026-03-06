import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Breadcrumb } from '../components/Breadcrumb';
import { FileList } from '../components/FileList';
import { useFiles } from '../hooks/useFiles';

export function FileBrowser() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useAuth();

  const currentPath = decodeURIComponent(location.pathname);
  const { entries, loading, error } = useFiles(currentPath);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {config?.appName}
        </Link>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Breadcrumb path={currentPath} baseRoute="/" />
        </div>

        {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {!loading && !error && (
          <FileList
            entries={entries}
            currentPath={currentPath}
            baseRoute="/"
            onNavigate={navigate}
          />
        )}
      </main>
    </div>
  );
}
