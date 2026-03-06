import { useState, useEffect, useCallback } from 'react';
import { FileEntry } from '../components/FileList';

interface UseFilesResult {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => void;
}

export function useFiles(path: string): UseFilesResult {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchFiles = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/files${path}`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 400) {
            // Path exists but is a file — let nginx serve it directly at its natural path
            window.location.href = path;
            return;
          }
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          throw new Error('Failed to load');
        }
        const data = await res.json() as { entries: FileEntry[] };
        setEntries(data.entries);
      })
      .catch(() => setError('Failed to load directory.'))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { entries, loading, error, notFound, reload: fetchFiles };
}
