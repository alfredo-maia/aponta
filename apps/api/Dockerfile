# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────
# Aponta API (NestJS) — multi-stage Dockerfile.
#
# Build context MUST be the monorepo root (see docker-compose*.yml:
# `context: .`, `dockerfile: apps/api/Dockerfile`) because this is an Nx
# workspace: the api project depends on the root pnpm-lock.yaml/
# pnpm-workspace.yaml and Nx's build graph, not just its own folder.
#
# Stages:
#   base        - shared Node + pnpm setup, nothing copied in yet
#   deps        - installs full workspace deps (dev+prod) via pnpm, cached
#                 by lockfile hash so source-only changes don't reinstall
#   build       - copies source, runs `nx run api:build` (webpack) and
#                 `nx run api:prisma-generate` to produce dist/apps/api
#                 plus a generated Prisma Client
#   development - target used by docker-compose.dev.yml: full workspace
#                 (deps + source) running `nx serve api` for live iteration
#                 against a bind-mounted source tree
#   production  - final, default (last stage wins with plain `docker build`)
#                 slim runtime: only production node_modules (pruned by
#                 `nx run api:prune`) + the built dist/apps/api output,
#                 no dev deps, no source, no Nx/TypeScript toolchain
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
# Prisma Client must exist before webpack bundles the api (PrismaService
# imports @prisma/client at module load time). `prisma generate` never
# connects to a DB, but prisma.config.ts's `env<Env>('DATABASE_URL')` still
# requires the variable to *resolve* to something at config-load time — a
# placeholder is sufficient and is never used to connect anywhere; the real
# DATABASE_URL is supplied at container runtime instead (see
# docker-compose.yml).
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN pnpm exec nx run api:prisma-generate
# NOTE: `nx run api:prune` (the @nx/js:prune-lockfile /
# copy-workspace-modules executors) requires a per-project
# apps/api/package.json, which this single-root-package.json workspace does
# not have — it fails with "apps/api/package.json does not exist" even
# outside Docker. Not needed anyway: `nx:webpack`'s NxAppWebpackPlugin
# (generatePackageJson: true, see apps/api/webpack.config.js) already
# writes an accurate, minimal dist/apps/api/package.json + pnpm-lock.yaml
# derived from actual imports during `build` itself — that's what the
# `production` stage below installs from.
RUN pnpm exec nx run api:build

# ---------------------------------------------------------------------------
# `development` target: what docker-compose.dev.yml builds today (no
# `target:` override needed there — the compose file's `build:` block omits
# `target`, and a Dockerfile with no build --target defaults to the LAST
# stage; since `development` is not last, docker-compose.dev.yml has been
# given an explicit `target: development` — see that file). Runs the Nx dev
# server directly against the full workspace so bind-mounted source edits
# (if added later) are picked up without a rebuild.
FROM deps AS development
COPY . .
# Same requirement as the `build` stage above: PrismaService imports
# @prisma/client at module load time, so the client must be generated
# before `nx serve api` ever runs — otherwise the container starts, NestJS
# throws `Cannot find module '.prisma/client/default'` on the first
# request/import, and Nx's watcher loops forever restarting a permanently
# broken process. `prisma generate` only reads the schema (no DB
# connection attempted), so the same build-time placeholder used above is
# fine here too; the real DATABASE_URL is injected at container runtime by
# docker-compose.dev.yml.
ENV DATABASE_URL="postgresql://user:***@localhost:5432/db?schema=public"
RUN pnpm exec nx run api:prisma-generate
ENV NODE_ENV=development
EXPOSE 3001
CMD ["pnpm", "exec", "nx", "run", "api:serve"]

# ---------------------------------------------------------------------------
# `production` target (final stage — the default for a plain `docker build`
# with no --target flag).
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S aponta && adduser -S aponta -G aponta

COPY --from=build /workspace/dist/apps/api ./
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/prisma.config.ts ./prisma.config.ts

# `nx:webpack`'s NxAppWebpackPlugin (generatePackageJson: true) derives the
# dependency list from source import/require detection, which misses
# `tslib` — webpack's `importHelpers` output calls `require('tslib')` from
# *generated* helper code, which the detector's source scan doesn't see.
# Patch it back in (same version pin as the root workspace's `tslib` dep)
# so `pnpm install --prod` below actually installs it; without this,
# `node main.js` fails at startup with `Cannot find module 'tslib'`.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.dependencies.tslib='^2.3.0';fs.writeFileSync('package.json', JSON.stringify(p, null, 2));"

# `nx:prune` already wrote a pruned package.json + pnpm-lock.yaml into
# dist/apps/api (includes `prisma`/`@prisma/client`/`@prisma/adapter-pg` as
# real deps, so the CLI is available here too for `prisma migrate deploy`);
# install only production deps from that pruned manifest so the final image
# has no devDependencies, no Nx, no TypeScript toolchain.
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate \
  && pnpm install --prod --no-frozen-lockfile --allow-build="@prisma/engines" --allow-build="prisma" \
  && pnpm store prune \
  && rm -rf /root/.local/share/pnpm/store /root/.cache

# `pnpm install` here is a fresh install of @prisma/client with no generated
# query engine yet — the one generated during the `build` stage lives in a
# node_modules tree that isn't copied into this stage. Prisma Client must be
# (re)generated against THIS stage's own node_modules, using the same
# placeholder DATABASE_URL trick as the build stage (prisma.config.ts only
# needs the var to resolve, never to actually connect for `generate`).
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
RUN npx --no-install prisma generate --schema=./prisma/schema.prisma --config=./prisma.config.ts
ENV DATABASE_URL=""

USER aponta

EXPOSE 3001

# NOTE: shell form (no JSON array) so ${API_PORT} is actually expanded at
# *runtime* by the shell that Docker invokes for shell-form HEALTHCHECK/CMD.
# Exec-form `CMD ["wget", ..., "${API_PORT:-3001}", ...]` never invokes a
# shell, so the literal string would be sent as-is instead of being
# substituted — here the container actually listens on whatever $API_PORT
# docker-compose.yml injects at runtime (e.g. 3001 in prod, but
# overridable), so the hardcoded default only fires if the var is
# genuinely unset inside the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT:-3001}/api" || exit 1

CMD ["node", "main.js"]
