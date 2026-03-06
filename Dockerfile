# ─── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:24-alpine AS build-frontend

RUN npm install -g pnpm

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install

COPY frontend/ ./

# No build-time env vars needed — frontend fetches config from /api/config at runtime
RUN pnpm build

# ─── Stage 2: Build backend ──────────────────────────────────────────────────
FROM node:24-alpine AS build-backend

RUN npm install -g pnpm

WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install

COPY backend/ ./
RUN pnpm build

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisord config
COPY supervisord.conf /etc/supervisord.conf

# Copy built frontend to nginx html root
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

# Copy built backend
WORKDIR /app/backend
COPY --from=build-backend /app/backend/dist ./dist
COPY --from=build-backend /app/backend/node_modules ./node_modules

# Files volume mount point
RUN mkdir -p /srv/files

# nginx temp dirs (running as non-root friendly)
RUN mkdir -p /tmp/nginx /var/log/nginx \
    && chown -R node:node /tmp/nginx /var/log/nginx /var/lib/nginx

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
