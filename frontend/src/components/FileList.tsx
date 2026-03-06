import { useState } from 'react';
import { Trash2, Pencil, Download, ClipboardCopy, ExternalLink, Check } from 'lucide-react';
import { FileIcon, isPreviewable } from './FileIcon';
import { PreviewModal } from './PreviewModal';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  mimeType: string | null;
}

interface FileListProps {
  entries: FileEntry[];
  currentPath: string;
  baseRoute: string;
  isAdmin?: boolean;
  onNavigate: (path: string) => void;
  onDelete?: (name: string, type: 'file' | 'directory') => void;
  onRenameStart?: (name: string) => void;
}

function formatSize(bytes: number, type: 'file' | 'directory'): string {
  if (type === 'directory') return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function FileList({ entries, currentPath, baseRoute, isAdmin, onNavigate, onDelete, onRenameStart }: FileListProps) {
  const [preview, setPreview] = useState<FileEntry | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>This folder is empty.</p>;
  }

  const filePath = (name: string) => {
    const cleanPath = currentPath.replace(/^\//, '');
    return `/${cleanPath ? `${cleanPath}/` : ''}${encodeURIComponent(name)}`;
  };

  const publicUrl = (entry: FileEntry) => {
    const cleanPath = currentPath.replace(/^\//, '');
    return `${window.location.origin}/${cleanPath ? `${cleanPath}/` : ''}${encodeURIComponent(entry.name)}`;
  };

  const copyLink = (entry: FileEntry) => {
    navigator.clipboard.writeText(publicUrl(entry)).then(() => {
      setCopiedName(entry.name);
      setTimeout(() => setCopiedName(null), 1500);
    });
  };

  const navPath = (entry: FileEntry) => {
    const cleanPath = currentPath.replace(/^\//, '');
    const base = baseRoute.replace(/\/$/, ''); // strip trailing slash to avoid //
    return `${base}/${cleanPath ? `${cleanPath}/` : ''}${encodeURIComponent(entry.name)}`;
  };

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Name', 'Size', 'Modified', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr
              key={entry.name}
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name */}
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileIcon mimeType={entry.mimeType} isDirectory={entry.type === 'directory'} />
                  {entry.type === 'directory' ? (
                    <button
                      onClick={() => onNavigate(navPath(entry))}
                      style={{ background: 'none', color: 'var(--text-primary)', fontWeight: 500, padding: 0, textAlign: 'left' }}
                    >
                      {entry.name}
                    </button>
                  ) : (
                    <span
                      onClick={() => isPreviewable(entry.mimeType) ? setPreview(entry) : undefined}
                      style={{ color: 'var(--text-primary)', cursor: isPreviewable(entry.mimeType) ? 'pointer' : 'default' }}
                    >
                      {entry.name}
                    </span>
                  )}
                </div>
              </td>

              {/* Size */}
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {formatSize(entry.size, entry.type)}
              </td>

              {/* Modified */}
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {formatDate(entry.modified)}
              </td>

              {/* Admin actions */}
              {isAdmin && (
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => copyLink(entry)}
                      title="Copy link"
                      style={{ background: 'none', color: copiedName === entry.name ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', padding: '2px', transition: 'color 0.15s' }}
                    >
                      {copiedName === entry.name ? <Check size={15} /> : <ClipboardCopy size={15} />}
                    </button>
                    <a
                      href={publicUrl(entry)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                      style={{ color: 'var(--text-secondary)', display: 'flex' }}
                    >
                      <ExternalLink size={15} />
                    </a>
                    {entry.type === 'file' && (
                      <a href={filePath(entry.name)} download title="Download" style={{ color: 'var(--text-secondary)', display: 'flex' }}>
                        <Download size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => onRenameStart?.(entry.name)}
                      title="Rename"
                      style={{ background: 'none', color: 'var(--text-secondary)', display: 'flex', padding: '2px' }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete?.(entry.name, entry.type)}
                      title="Delete"
                      style={{ background: 'none', color: 'var(--danger)', display: 'flex', padding: '2px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {preview && (
        <PreviewModal
          filePath={filePath(preview.name)}
          fileName={preview.name}
          mimeType={preview.mimeType}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
