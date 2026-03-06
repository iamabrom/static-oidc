import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import hljs from 'highlight.js';
import { isImage, isVideo, isAudio, isText } from './FileIcon';

interface PreviewModalProps {
  filePath: string;
  fileName: string;
  mimeType: string | null;
  onClose: () => void;
}

export function PreviewModal({ filePath, fileName, mimeType, onClose }: PreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isText(mimeType)) {
      setLoading(true);
      fetch(filePath)
        .then(r => r.text())
        .then(text => setTextContent(text))
        .catch(() => setTextContent('Failed to load file content.'))
        .finally(() => setLoading(false));
    }

    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [filePath, mimeType]);

  const highlighted = textContent
    ? hljs.highlightAuto(textContent).value
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          minWidth: '320px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: '16px' }}>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href={filePath} download style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }} title="Download">
              <Download size={16} />
            </a>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '2px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', padding: isImage(mimeType) ? '0' : '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {isImage(mimeType) && (
            <img src={filePath} alt={fileName} style={{ maxWidth: '85vw', maxHeight: '80vh', display: 'block', objectFit: 'contain' }} />
          )}
          {isVideo(mimeType) && (
            <video controls style={{ maxWidth: '85vw', maxHeight: '80vh' }}>
              <source src={filePath} type={mimeType!} />
            </video>
          )}
          {isAudio(mimeType) && (
            <audio controls style={{ width: '400px', maxWidth: '80vw' }}>
              <source src={filePath} type={mimeType!} />
            </audio>
          )}
          {isText(mimeType) && (
            loading ? (
              <span style={{ color: 'var(--text-secondary)' }}>Loading…</span>
            ) : (
              <pre style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, overflow: 'auto', maxHeight: '70vh', maxWidth: '80vw', width: '100%' }}>
                <code dangerouslySetInnerHTML={{ __html: highlighted || '' }} />
              </pre>
            )
          )}
        </div>
      </div>
    </div>
  );
}
