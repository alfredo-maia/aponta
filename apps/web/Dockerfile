# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────
# Aponta Web (React + Vite) — multi-stage Dockerfile.
#
# Build context MUST be the monorepo root (same reasoning as
# apps/api/Dockerfile: Nx workspace, shared root lockfile).
#
# Stages:
#   base        - shared Node + pnpm setup
#   deps        - full workspace deps (dev+prod) via pnpm, cached by
#                 lockfile hash
#   build       - copies source, runs `nx run web:build` (Vite) to produce
#                 static assets in dist/apps/web
#   development - target used by docker-compose.dev.yml: runs the Vite dev
#                 server (`nx serve web`) for live iteration
#   production  - final, default: nginx serving the static Vite build
#                 output, no Node runtime at all in the final image
# ─────────────────────────────────────────────────────────────────────────

FROM node:24-alpine AS base
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
# VITE_API_URL is read at *build* time by Vite (import.meta.env), so it must
# be provided as a build ARG for the production image. Defaults to a
# same-origin relative path matching apps/web/src/lib/api.ts's `/api`
# baseURL, which is what production docker-compose.yml relies on (nginx
# below proxies `/api/*` to the api service — see nginx.conf).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm exec nx run web:build

# ---------------------------------------------------------------------------
# `development` target: what docker-compose.dev.yml builds today (compose
# file has been given an explicit `target: development`, same as the api
# Dockerfile, since this stage is not last). Runs the real Vite dev server
# with HMR against the full workspace.
FROM deps AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "exec", "nx", "run", "web:serve", "--host", "0.0.0.0"]

# ---------------------------------------------------------------------------
# `production` target (final stage — default for a plain `docker build`).
# Static assets only: nginx:alpine has no Node, no source, no node_modules.
FROM nginx:1.27-alpine AS production
# nginx:1.27's docker-entrypoint.sh envsubst's any *.template file under
# /etc/nginx/templates/ into /etc/nginx/conf.d/ (stripping the .template
# suffix) before nginx starts, substituting only the env vars explicitly
# named via NGINX_ENVSUBST_FILTER below (default envsubst would also touch
# nginx's own built-in $variables like $host/$uri, corrupting the config) —
# this is how nginx.conf's `${API_PORT}` in the /api/ proxy_pass gets
# resolved to whatever API_PORT docker-compose.yml sets on the `web`
# service at container start, instead of a value baked in at build time.
ENV NGINX_ENVSUBST_FILTER=API_PORT
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/apps/web /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
