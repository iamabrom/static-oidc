import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FolderPlus, LogOut, Home } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Breadcrumb } from '../components/Breadcrumb';
import { FileList } from '../components/FileList';
import { UploadZone } from '../components/UploadZone';
import { useAdminFiles } from '../hooks/useAdminFiles';

export function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, config } = useAuth();

  const rawPath = location.pathname.replace(/^\/_admin/, '') || '/';
  const currentPath = decodeURIComponent(rawPath);

  const { entries, loading, error, reload, createFolder, deleteItem, renameItem } = useAdminFiles(currentPath);

  // New folder state
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');

  // Delete confirm state
  const [deleting, setDeleting] = useState<{ name: string; type: 'file' | 'directory' } | null>(null);

  useEffect(() => {
    if (creatingFolder) folderInputRef.current?.focus();
  }, [creatingFolder]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const ok = await createFolder(folderName.trim());
    if (ok) { setFolderName(''); setCreatingFolder(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const ok = await deleteItem(deleting.name, deleting.type);
    if (ok) setDeleting(null);
  };

  const handleRename = async () => {
    if (!renaming || !renameTo.trim()) return;
    const ok = await renameItem(renaming, renameTo.trim());
    if (ok) { setRenaming(null); setRenameTo(''); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <Link to="/_admin" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
          {config?.appName} <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '13px' }}>admin</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{user?.name}</span>
          <Link to="/" style={{ color: 'var(--text-secondary)', display: 'flex' }} title="Public view">
            <Home size={16} />
          </Link>
          <button onClick={logout} style={{ background: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Breadcrumb path={currentPath} baseRoute="/_admin" />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCreatingFolder(true)}
              style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <FolderPlus size={14} /> New folder
            </button>
          </div>
        </div>

        {/* New folder input */}
        {creatingFolder && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <input
              ref={folderInputRef}
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setCreatingFolder(false); setFolderName(''); }
              }}
              placeholder="Folder name"
              style={{ flex: 1 }}
            />
            <button onClick={handleCreateFolder} style={{ background: 'var(--accent)', color: '#fff', padding: '6px 14px' }}>Create</button>
            <button onClick={() => { setCreatingFolder(false); setFolderName(''); }} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 14px' }}>Cancel</button>
          </div>
        )}

        {/* Upload zone */}
        <div style={{ marginBottom: '24px' }}>
          <UploadZone currentPath={currentPath} onUploadComplete={reload} />
        </div>

        {/* File list */}
        {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {!loading && !error && (
          <FileList
            entries={entries}
            currentPath={currentPath}
            baseRoute="/_admin"
            isAdmin
            onNavigate={navigate}
            onDelete={(name, type) => setDeleting({ name, type })}
            onRenameStart={name => { setRenaming(name); setRenameTo(name); }}
          />
        )}

        {/* Rename modal */}
        {renaming && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
              <p style={{ marginBottom: '16px', fontWeight: 500 }}>Rename "{renaming}"</p>
              <input
                autoFocus
                value={renameTo}
                onChange={e => setRenameTo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenaming(null);
                }}
                style={{ width: '100%', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setRenaming(null)} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 14px' }}>Cancel</button>
                <button onClick={handleRename} style={{ background: 'var(--accent)', color: '#fff', padding: '6px 14px' }}>Rename</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {deleting && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>Delete "{deleting.name}"?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                {deleting.type === 'directory' ? 'This will delete the folder and all its contents. ' : ''}
                This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleting(null)} style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 14px' }}>Cancel</button>
                <button onClick={handleDelete} style={{ background: 'var(--danger)', color: '#fff', padding: '6px 14px' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
