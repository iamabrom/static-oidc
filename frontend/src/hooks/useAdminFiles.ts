import { useState, useEffect, useCallback } from 'react';
import { FileEntry } from '../components/FileList';

interface UseAdminFilesResult {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  createFolder: (name: string) => Promise<boolean>;
  deleteItem: (name: string, type: 'file' | 'directory') => Promise<boolean>;
  renameItem: (from: string, to: string) => Promise<boolean>;
}

export function useAdminFiles(path: string): UseAdminFilesResult {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cleanPath = path.replace(/^\//, '');
  const basePath = cleanPath ? `${cleanPath}/` : '';

  const fetchFiles = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/files${path}`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json() as { entries: FileEntry[] };
        setEntries(data.entries);
      })
      .catch(() => setError('Failed to load directory.'))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createFolder = async (name: string): Promise<boolean> => {
    const res = await fetch(
      `/api/admin/mkdir/${basePath}${encodeURIComponent(name.trim())}`,
      { method: 'POST', credentials: 'include' }
    );
    if (res.ok) fetchFiles();
    return res.ok;
  };

  const deleteItem = async (name: string, _type: 'file' | 'directory'): Promise<boolean> => {
    const res = await fetch(
      `/api/admin/delete/${basePath}${encodeURIComponent(name)}`,
      { method: 'DELETE', credentials: 'include' }
    );
    if (res.ok) fetchFiles();
    return res.ok;
  };

  const renameItem = async (from: string, to: string): Promise<boolean> => {
    const res = await fetch('/api/admin/rename', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${basePath}${from}`,
        to: `${basePath}${to.trim()}`,
      }),
    });
    if (res.ok) fetchFiles();
    return res.ok;
  };

  return { entries, loading, error, reload: fetchFiles, createFolder, deleteItem, renameItem };
}
