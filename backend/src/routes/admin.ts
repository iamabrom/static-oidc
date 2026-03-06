import { Router, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';

const router = Router();
const FILES_ROOT = process.env.FILES_PATH || '/srv/files';

// All admin routes require a valid JWT with admin group membership
router.use(verifyToken);

function sanitizePath(requestedPath: string | string[]): string | null {
  // Express 5 wildcard params return string[] for multi-segment paths — join with /
  const raw = Array.isArray(requestedPath) ? requestedPath.join('/') : (requestedPath || '');
  const decoded = decodeURIComponent(raw);
  const resolved = path.resolve(FILES_ROOT, decoded.replace(/^\//, ''));
  if (!resolved.startsWith(FILES_ROOT)) return null;
  return resolved;
}

// Multer — store uploads directly to destination path
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dest = sanitizePath(req.params['path'] || '');
      if (!dest) {
        cb(new Error('Invalid upload path'), '');
        return;
      }
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB max per file
});

// POST /api/admin/upload/*path
router.post('/upload{/*path}', upload.array('files'), (req: AuthenticatedRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }
  res.json({ uploaded: files.map(f => f.originalname) });
});

// DELETE /api/admin/delete/*path
router.delete('/delete/*path', async (req: AuthenticatedRequest, res: Response) => {
  const targetPath = sanitizePath(req.params['path']);
  if (!targetPath) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
    res.json({ deleted: req.params['path'] });
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Path not found' });
    } else {
      console.error('Delete error:', err);
      res.status(500).json({ error: 'Failed to delete' });
    }
  }
});

// POST /api/admin/mkdir/*path
router.post('/mkdir/*path', async (req: AuthenticatedRequest, res: Response) => {
  const targetPath = sanitizePath(req.params['path']);
  if (!targetPath) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    await fs.mkdir(targetPath, { recursive: true });
    res.json({ created: req.params['path'] });
  } catch (err) {
    console.error('Mkdir error:', err);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

// POST /api/admin/rename
router.post('/rename', async (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.body as { from: string; to: string };

  if (!from || !to) {
    res.status(400).json({ error: 'Missing from or to' });
    return;
  }

  const fromPath = sanitizePath(from);
  const toPath = sanitizePath(to);

  if (!fromPath || !toPath) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    await fs.rename(fromPath, toPath);
    res.json({ from, to });
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Source path not found' });
    } else {
      console.error('Rename error:', err);
      res.status(500).json({ error: 'Failed to rename' });
    }
  }
});

export { router as adminRouter };
