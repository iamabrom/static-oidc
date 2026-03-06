import { useState, useEffect, useCallback } from 'react';
import { FileEntry } from '../components/FileList';

interface UseFilesResult {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useFiles(path: string): UseFilesResult {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/files${path}`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 404) {
            // Not a directory — let nginx serve the raw file directly
            window.location.href = `/files${path}`;
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

  return { entries, loading, error, reload: fetchFiles };
}
