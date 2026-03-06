import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { filesRouter } from './routes/files';
import { adminRouter } from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.APP_URL,
  credentials: true,
}));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/admin', adminRouter);

// Public runtime config — exposes only the non-sensitive values the frontend needs
// This replaces build-time VITE_* env vars, making the Docker image fully portable
app.get('/api/config', (_req, res) => {
  res.json({
    appUrl: process.env.APP_URL,
    oidcClientId: process.env.OIDC_CLIENT_ID,
    appName: process.env.APP_NAME || 'static-oidc',
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`static-oidc backend running on port ${PORT}`);
});
