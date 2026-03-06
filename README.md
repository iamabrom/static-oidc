# static-oidc

A lightweight, self-hosted static file server with a built-in admin interface protected by OIDC authentication.

Serve files and static websites publicly, manage them securely — works with any OIDC-compliant identity provider (Amazon Cognito, Authentik, Authelia, Keycloak, and more).

---

## Features

- **Raw file serving** — files are served exactly as-is, with no processing or wrapping. Enables full static website hosting (`index.html` auto-served per directory).
- **Public file browser** — clean dark UI with directory listings and inline previews for images, text/code, video, and audio.
- **Protected admin panel** — upload, delete, rename, and create folders via `/_admin`, secured by OIDC.
- **Backend-for-Frontend (BFF) auth** — tokens never touch the browser. Auth is handled server-side and stored in HttpOnly cookies, protecting against XSS.
- **Any OIDC provider** — works with any standards-compliant IdP. Group-based access control via a configurable JWT claim.
- **Single container** — nginx + Express + React in one Docker image. No sidecars, no databases, no external auth middleware needed.

---

## Quick Start

### 1. Pull the image

```bash
docker pull ghcr.io/iamabrom/static-oidc:latest
```

### 2. Create a `docker-compose.yml`

```yaml
services:
  static-oidc:
    image: ghcr.io/iamabrom/static-oidc:latest
    container_name: static-oidc
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ${FILES_PATH}:/srv/files
    environment:
      - TZ=${TZ}
      - APP_URL=${APP_URL}
      - APP_NAME=${APP_NAME:-static-oidc}
      - OIDC_ISSUER_URL=${OIDC_ISSUER_URL}
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_GROUPS_CLAIM=${OIDC_GROUPS_CLAIM:-groups}
      - OIDC_ADMIN_GROUP=${OIDC_ADMIN_GROUP}
```

### 3. Create a `.env` file

```env
TZ=America/New_York
FILES_PATH=/path/to/your/files
APP_URL=https://files.example.com
APP_NAME=My Files

OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_ADMIN_GROUP=static-oidc-admins
OIDC_GROUPS_CLAIM=groups
```

### 4. Start it

```bash
docker compose up -d
```

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `TZ` | Yes | Timezone e.g. `America/New_York` |
| `FILES_PATH` | Yes | Host path to serve files from e.g. `/mnt/files` |
| `APP_URL` | Yes | Full public URL, no trailing slash |
| `OIDC_ISSUER_URL` | Yes | Your IdP's issuer URL |
| `OIDC_CLIENT_ID` | Yes | OIDC app client ID |
| `OIDC_CLIENT_SECRET` | Yes | OIDC app client secret |
| `OIDC_ADMIN_GROUP` | Yes | IdP group name required for admin access |
| `OIDC_GROUPS_CLAIM` | No | JWT claim for groups. Defaults to `groups` |
| `APP_NAME` | No | Display name in the UI header and browser tab. Defaults to `static-oidc` |

---

## OIDC Provider Setup

Your IdP app client must be configured as a **confidential client** (with a client secret) with the following:

- **Allowed callback URL:** `{APP_URL}/callback`
- **Allowed sign-out URL:** `{APP_URL}`
- **Grant type:** Authorization code
- **Scopes:** `openid`, `email`, `profile`
- A group matching `OIDC_ADMIN_GROUP` with your admin users assigned to it
- Groups included in the access token under the claim matching `OIDC_GROUPS_CLAIM`

### Provider-specific notes

**AWS Cognito:** Set `OIDC_GROUPS_CLAIM=cognito:groups`. Ensure the hosted UI is enabled with a domain configured.

**Authentik / Authelia / Keycloak:** Use `OIDC_GROUPS_CLAIM=groups` (the default). Ensure groups are mapped into the access token scope.

---

## Running Locally (Development)

There are two ways to run locally — dev servers for fast iteration, or Docker for a full end-to-end test.

### Option A — Dev servers (recommended for development)

You'll need [Node.js](https://nodejs.org) 24+ and [pnpm](https://pnpm.io).

**1. Create a test files folder:**

```bash
mkdir -p ~/static-oidc-files
```

Drop a few files and a subfolder in there so you have something to browse.

**2. Create `backend/.env`:**

```env
APP_URL=http://localhost:5173
APP_NAME=My Files
FILES_PATH=/Users/YOUR_USERNAME/static-oidc-files
OIDC_ISSUER_URL=https://your-idp.example.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ADMIN_GROUP=static-oidc-admins
OIDC_GROUPS_CLAIM=groups
```

> The frontend has **no build-time environment variables** — it fetches config from the backend at runtime via `/api/config`. No `frontend/.env` file is needed.

**3. Start both processes:**

**Terminal 1 — backend:**
```bash
cd backend
pnpm install
pnpm dev
```

**Terminal 2 — frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to Express on port 3001.

> Add `http://localhost:5173/callback` as an allowed redirect URI in your IdP before testing auth.

**What works:** directory listing, full auth flow, admin panel, upload, delete, rename, create folder.

**What doesn't work:** direct file downloads and previews. Clicking a non-directory file redirects to `/files/…`, which is served by nginx — nginx isn't running in this mode. Use Option B to test file serving end-to-end.

---

### Option B — Docker (full end-to-end test)

**1. Create a test files folder:**

```bash
mkdir -p ~/static-oidc-files
```

**2. Create a `.env` file in the project root:**

```env
APP_URL=http://localhost:8080
APP_NAME=My Files
FILES_PATH=/Users/YOUR_USERNAME/static-oidc-files
OIDC_ISSUER_URL=https://your-idp.example.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ADMIN_GROUP=static-oidc-admins
OIDC_GROUPS_CLAIM=groups
TZ=America/New_York
```

Note `APP_URL` uses port `8080` to match the `docker-compose.yml` port mapping.

**3. Build and start:**

```bash
docker compose up --build
```

Open `http://localhost:8080`. Everything works — nginx serves the React app, proxies API requests to Express, and serves raw files from `/files/*`.

> Add `http://localhost:8080/callback` as an allowed redirect URI in your IdP before testing auth.

> **Mac + Docker Desktop:** Docker Desktop allows mounting paths under `/Users` by default, so `~/static-oidc-files` will work. If you see volume mount errors, check Docker Desktop → Settings → Resources → File Sharing.

No build arguments are needed. The Docker image is fully portable — `APP_URL` and `OIDC_CLIENT_ID` are injected at runtime, not baked into the build.

> After running `pnpm install` in both `frontend/` and `backend/`, commit the generated `pnpm-lock.yaml` files. The Docker build will use them for reproducible installs.

---

## Deploying via Dokploy (or any platform)

A pre-built image is published to GitHub Container Registry on every push to `main`:

```
ghcr.io/iamabrom/static-oidc:latest
```

In Dokploy (or any Docker host), use this `docker-compose.yml`:

```yaml
services:
  static-oidc:
    image: ghcr.io/iamabrom/static-oidc:latest
    container_name: static-oidc
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ${FILES_PATH}:/srv/files
    environment:
      - TZ=${TZ}
      - APP_URL=${APP_URL}
      - APP_NAME=${APP_NAME:-static-oidc}
      - OIDC_ISSUER_URL=${OIDC_ISSUER_URL}
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_GROUPS_CLAIM=${OIDC_GROUPS_CLAIM:-groups}
      - OIDC_ADMIN_GROUP=${OIDC_ADMIN_GROUP}
```

Set your environment variables in Dokploy's UI. Domain and SSL termination are handled by Dokploy's reverse proxy — no changes to the compose file are needed.

---

## How It Works

```
Browser
  │
  ├── /files/*          → nginx serves raw files directly from the mounted volume
  ├── /api/*            → nginx proxies to Express backend (port 3001)
  └── everything else   → nginx checks for index.html in mounted volume first
                              │
                              ├── index.html exists at path → served directly (static site mode)
                              └── no index.html → React SPA
                                      │
                                      ├── /*           Public file browser
                                      ├── /callback    OIDC callback handler
                                      └── /_admin/*    Admin panel (requires OIDC auth)
```

**Auth flow:**
1. User visits `/_admin` → frontend calls `/api/auth/login` → redirected to IdP
2. IdP redirects back to `/callback` with an authorization code
3. Backend exchanges the code for tokens using the client secret
4. Tokens stored in an **HttpOnly cookie** — JavaScript never sees them
5. Every admin API call verifies the JWT using the IdP's JWKS (cached in memory)
6. Expired access tokens are silently refreshed using the refresh token

---

## Tech Stack

- **Frontend:** React 18, React Router v6, TypeScript, Vite
- **Backend:** Express 5, TypeScript, `jose` (JWT/JWKS)
- **Container:** nginx, supervisord, Node 24 Alpine, multi-stage Docker build

---

## License

MIT
