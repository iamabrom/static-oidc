import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

const ISSUER_URL = process.env.OIDC_ISSUER_URL!;
const CLIENT_ID = process.env.OIDC_CLIENT_ID!;
const CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET!;
const GROUPS_CLAIM = process.env.OIDC_GROUPS_CLAIM || 'groups';
const ADMIN_GROUP = process.env.OIDC_ADMIN_GROUP!;
const COOKIE_NAME = process.env.COOKIE_NAME || 'static_oidc_session';
// Only set Secure flag when deployed over HTTPS — allows local HTTP dev to work
const COOKIE_SECURE = process.env.APP_URL?.startsWith('https://') ?? true;

// Cache the JWKS — jose handles in-memory caching and automatic key rotation
const getJWKS = (() => {
  let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    if (!jwks) {
      jwks = createRemoteJWKSet(
        new URL(`${ISSUER_URL}/.well-known/jwks.json`)
      );
    }
    return jwks;
  };
})();

// Cache the token endpoint URL — fetched once from OIDC discovery, never changes at runtime
let tokenEndpointCache: string | null = null;
async function getTokenEndpoint(): Promise<string> {
  if (!tokenEndpointCache) {
    const res = await fetch(`${ISSUER_URL}/.well-known/openid-configuration`);
    const discovery = await res.json() as { token_endpoint: string };
    tokenEndpointCache = discovery.token_endpoint;
  }
  return tokenEndpointCache;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  displayName?: string;
  userEmail?: string;
}

interface CookiePayload {
  accessToken: string;
  refreshToken: string;
  displayName?: string;
  email?: string;
}

async function verifyAccessToken(token: string): Promise<JWTPayload> {
  // Verify signature and issuer. Skip built-in audience check because some
  // providers (e.g. AWS Cognito) use a 'client_id' claim instead of 'aud'.
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: ISSUER_URL,
  });

  // Manually verify client identity: standard OIDC uses 'aud', Cognito uses 'client_id'
  const aud = payload.aud;
  const clientIdClaim = payload['client_id'] as string | undefined;
  const audMatch = aud === CLIENT_ID || (Array.isArray(aud) && aud.includes(CLIENT_ID));
  const clientIdMatch = clientIdClaim === CLIENT_ID;

  if (!audMatch && !clientIdMatch) {
    throw new Error(`Token client mismatch: aud=${JSON.stringify(aud)}, client_id=${clientIdClaim}`);
  }

  return payload;
}

async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const tokenEndpoint = await getTokenEndpoint();

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) return null;

    const data = await res.json() as { access_token: string; refresh_token?: string };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // use new refresh token if rotated
    };
  } catch {
    return null;
  }
}

function parseCookie(cookieValue: string): CookiePayload | null {
  try {
    return JSON.parse(Buffer.from(cookieValue, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

function serializeCookie(data: CookiePayload): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function setCookieOnResponse(res: Response, data: CookiePayload): void {
  res.cookie(COOKIE_NAME, serializeCookie(data), {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    path: '/',
    // No explicit maxAge — session cookie, cleared when browser closes
    // unless refreshed by silent renewal
  });
}

export function clearCookieOnResponse(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict', path: '/' });
}

function hasAdminGroup(payload: JWTPayload): boolean {
  const groups = payload[GROUPS_CLAIM];
  if (!Array.isArray(groups)) return false;
  return groups.includes(ADMIN_GROUP);
}

// Shared logic: verify cookie, refresh if needed, attach payload to req.
// Returns true if successful, false if a response was already sent.
async function resolveToken(
  req: AuthenticatedRequest,
  res: Response
): Promise<boolean> {
  const cookieValue = req.cookies?.[COOKIE_NAME];

  if (!cookieValue) {
    res.status(401).json({ error: 'Unauthenticated' });
    return false;
  }

  const parsed = parseCookie(cookieValue);
  if (!parsed) {
    clearCookieOnResponse(res);
    res.status(401).json({ error: 'Invalid session' });
    return false;
  }

  let payload: JWTPayload;

  try {
    payload = await verifyAccessToken(parsed.accessToken);
  } catch (err: unknown) {
    const isExpired =
      err instanceof Error && err.message.toLowerCase().includes('expired');

    if (!isExpired) {
      console.error('Token verification failed:', err instanceof Error ? err.message : err);
      clearCookieOnResponse(res);
      res.status(401).json({ error: 'Invalid token' });
      return false;
    }

    const refreshed = await refreshTokens(parsed.refreshToken);
    if (!refreshed) {
      clearCookieOnResponse(res);
      res.status(401).json({ error: 'Session expired' });
      return false;
    }

    try {
      payload = await verifyAccessToken(refreshed.accessToken);
    } catch {
      clearCookieOnResponse(res);
      res.status(401).json({ error: 'Invalid refreshed token' });
      return false;
    }

    // Preserve displayName/email from original cookie — they don't change on refresh
    setCookieOnResponse(res, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      displayName: parsed.displayName,
      email: parsed.email,
    });
  }

  req.user = payload;
  req.displayName = parsed.displayName;
  req.userEmail = parsed.email;
  return true;
}

// Verifies the session token — for auth-only routes (no admin check).
export async function verifyTokenOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (await resolveToken(req, res)) next();
}

// Verifies the session token AND requires admin group membership — for admin routes.
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!await resolveToken(req, res)) return;

  if (!hasAdminGroup(req.user!)) {
    res.status(403).json({ error: 'Forbidden — not in admin group' });
    return;
  }

  next();
}
