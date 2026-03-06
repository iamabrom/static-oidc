import { Router, Request, Response } from 'express';
import { verifyTokenOnly, setCookieOnResponse, clearCookieOnResponse, AuthenticatedRequest } from '../middleware/verifyToken';

const router = Router();

const ISSUER_URL = process.env.OIDC_ISSUER_URL!;
const CLIENT_ID = process.env.OIDC_CLIENT_ID!;
const CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET!;
const APP_URL = process.env.APP_URL!;
const GROUPS_CLAIM = process.env.OIDC_GROUPS_CLAIM || 'groups';
const ADMIN_GROUP = process.env.OIDC_ADMIN_GROUP!;
const COOKIE_NAME = process.env.COOKIE_NAME || 'static_oidc_session';

// Cache discovery document
let discoveryCache: {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
} | null = null;

async function getDiscovery() {
  if (!discoveryCache) {
    const res = await fetch(`${ISSUER_URL}/.well-known/openid-configuration`);
    discoveryCache = await res.json();
  }
  return discoveryCache!;
}

// Simple PKCE helpers
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeVerifier(): Promise<string> {
  const { randomBytes } = await import('crypto');
  return base64UrlEncode(randomBytes(32));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const { createHash } = await import('crypto');
  return base64UrlEncode(createHash('sha256').update(verifier).digest());
}

// In-memory PKCE state store (short-lived, keyed by state param)
const pkceStore = new Map<string, { codeVerifier: string; expiresAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pkceStore.entries()) {
    if (value.expiresAt < now) pkceStore.delete(key);
  }
}, 5 * 60 * 1000);

// GET /api/auth/login
// Returns the OIDC authorization URL for the frontend to redirect to
router.get('/login', async (_req: Request, res: Response) => {
  try {
    const discovery = await getDiscovery();
    const { randomBytes } = await import('crypto');

    const state = base64UrlEncode(randomBytes(16));
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store verifier against state — expires in 10 minutes
    pkceStore.set(state, { codeVerifier, expiresAt: Date.now() + 10 * 60 * 1000 });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: `${APP_URL}/callback`,
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.json({ url: `${discovery.authorization_endpoint}?${params.toString()}` });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to build authorization URL' });
  }
});

// POST /api/auth/callback
// Exchanges authorization code for tokens, sets HttpOnly cookie
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body as { code: string; state: string };

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state' });
      return;
    }

    const pkceEntry = pkceStore.get(state);
    if (!pkceEntry || pkceEntry.expiresAt < Date.now()) {
      pkceStore.delete(state);
      res.status(400).json({ error: 'Invalid or expired state' });
      return;
    }

    pkceStore.delete(state);

    const discovery = await getDiscovery();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${APP_URL}/callback`,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: pkceEntry.codeVerifier,
    });

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      res.status(401).json({ error: 'Token exchange failed' });
      return;
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      id_token?: string;
    };

    // Decode access token for groups
    const accessPayload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString());
    const groups: string[] = Array.isArray(accessPayload[GROUPS_CLAIM]) ? accessPayload[GROUPS_CLAIM] : [];

    // Decode id_token for display name and email — it carries identity claims the access token may lack (e.g. Cognito)
    let displayName: string | undefined;
    let email: string | undefined;
    if (tokens.id_token) {
      try {
        const idPayload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
        displayName = idPayload.given_name || idPayload.name || idPayload.email || idPayload['cognito:username'];
        email = idPayload.email;
      } catch { /* fall through */ }
    }
    // Fallback to access token claims if id_token wasn't present or lacked the fields
    displayName ??= accessPayload.name || accessPayload.email || accessPayload['cognito:username'] || accessPayload.sub;
    email ??= accessPayload.email || accessPayload.sub;

    setCookieOnResponse(res, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      displayName,
      email,
    });

    res.json({
      user: {
        email,
        name: displayName,
        isAdmin: groups.includes(ADMIN_GROUP),
      },
    });
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ error: 'Callback failed' });
  }
});

// POST /api/auth/logout
// Clears the HttpOnly cookie and returns the IdP logout URL
router.post('/logout', async (_req: Request, res: Response) => {
  try {
    clearCookieOnResponse(res);
    const discovery = await getDiscovery();
    const logoutUrl = discovery.end_session_endpoint
      ? `${discovery.end_session_endpoint}?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(APP_URL)}`
      : APP_URL;

    res.json({ logoutUrl });
  } catch (err) {
    console.error('Logout error:', err);
    // Still clear the cookie even if discovery fails
    clearCookieOnResponse(res);
    res.json({ logoutUrl: APP_URL });
  }
});

// GET /api/auth/me
// Returns current user info — 401 if unauthenticated
router.get('/me', verifyTokenOnly, (req: AuthenticatedRequest, res: Response) => {
  const payload = req.user!;
  const groups: string[] = Array.isArray(payload[GROUPS_CLAIM]) ? payload[GROUPS_CLAIM] as string[] : [];

  res.json({
    user: {
      email: req.userEmail || payload.sub,
      name: req.displayName || payload.sub,
      isAdmin: groups.includes(ADMIN_GROUP),
    },
  });
});

export { router as authRouter };
