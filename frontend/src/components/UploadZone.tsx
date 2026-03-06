import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

interface UploadProgress {
  name: string;
  progress: number;
  done: boolean;
  error: boolean;
}

interface UploadZoneProps {
  currentPath: string;
  onUploadComplete: () => void;
}

export function UploadZone({ currentPath, onUploadComplete }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = (files: File[]) => {
    files.forEach(file => {
      setUploads(prev => [...prev, { name: file.name, progress: 0, done: false, error: false }]);

      const formData = new FormData();
      formData.append('files', file);

      const cleanPath = currentPath.replace(/^\//, '');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/upload/${cleanPath}`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(u => u.name === file.name ? { ...u, progress: pct } : u));
        }
      };

      xhr.onload = () => {
        const success = xhr.status >= 200 && xhr.status < 300;
        setUploads(prev => prev.map(u => u.name === file.name ? { ...u, done: true, error: !success, progress: 100 } : u));
        if (success) {
          setTimeout(() => {
            setUploads(prev => prev.filter(u => u.name !== file.name));
            onUploadComplete();
          }, 1500);
        }
      };

      xhr.onerror = () => {
        setUploads(prev => prev.map(u => u.name === file.name ? { ...u, done: true, error: true } : u));
      };

      xhr.send(formData);
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(79,142,247,0.05)' : 'transparent',
          transition: 'border-color var(--transition), background var(--transition)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        }}
      >
        <Upload size={20} color="var(--text-secondary)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Drop files here or <span style={{ color: 'var(--accent)' }}>click to upload</span>
        </span>
        <input ref={inputRef} type="file" multiple onChange={onFileChange} style={{ display: 'none' }} />
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {uploads.map(u => (
            <div key={u.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{u.name}</span>
                <span style={{ color: u.error ? 'var(--danger)' : u.done ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {u.error ? 'Failed' : u.done ? 'Done' : `${u.progress}%`}
                </span>
              </div>
              <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${u.progress}%`,
                  background: u.error ? 'var(--danger)' : 'var(--accent)',
                  transition: 'width 200ms ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
