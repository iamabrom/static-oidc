import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

const router = Router();
const FILES_ROOT = process.env.FILES_PATH || '/srv/files';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  mimeType: string | null;
}

function sanitizePath(requestedPath: string | string[]): string | null {
  // Express 5 wildcard params return string[] for multi-segment paths — join with /
  const raw = Array.isArray(requestedPath) ? requestedPath.join('/') : (requestedPath || '');
  const decoded = decodeURIComponent(raw);
  const resolved = path.resolve(FILES_ROOT, decoded.replace(/^\//, ''));
  // Prevent directory traversal
  if (!resolved.startsWith(FILES_ROOT)) return null;
  return resolved;
}

// GET /api/files/*path
router.get('{/*path}', async (req: Request, res: Response) => {
  const param = req.params['path'];
  const pathStr = Array.isArray(param) ? param.join('/') : (param || '');
  const absolutePath = sanitizePath(pathStr);

  if (!absolutePath) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    const stat = await fs.stat(absolutePath);

    if (!stat.isDirectory()) {
      res.status(400).json({ error: 'Not a directory' });
      return;
    }

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const files: FileEntry[] = await Promise.all(
      entries
        .filter(e => !e.name.startsWith('.')) // hide dotfiles
        .map(async (entry) => {
          const entryPath = path.join(absolutePath, entry.name);
          const entryStat = await fs.stat(entryPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entryStat.size,
            modified: entryStat.mtime.toISOString(),
            mimeType: entry.isFile() ? (mime.lookup(entry.name) || null) : null,
          } as FileEntry;
        })
    );

    // Directories first, then files — both alphabetical
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ path: `/${pathStr}`, entries: files });
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Path not found' });
    } else {
      console.error('Files error:', err);
      res.status(500).json({ error: 'Failed to read directory' });
    }
  }
});

export { router as filesRouter };
