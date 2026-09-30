import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

/**
 * Dedicated E2E ports (not the default 3000/3001 from apps' .env): this
 * avoids clashing with an already-running `pnpm dev` instance, or with any
 * unrelated process already bound to 3000 on the host. `WEB_PORT`/`API_PORT`
 * are read directly by apps/web/vite.config.mts (server.port + the `/api`
 * proxy target) so the whole stack shifts together.
 */
const E2E_WEB_PORT = process.env['E2E_WEB_PORT'] || '3100';
const E2E_API_PORT = process.env['E2E_API_PORT'] || '3101';

const baseURL = process.env['BASE_URL'] || `http://localhost:${E2E_WEB_PORT}`;

/**
 * Full-stack E2E config: these specs hit a REAL running API + web dev
 * server + real Postgres, not mocked `api.ts`. `webServer` below starts
 * both automatically so `pnpm nx e2e web-e2e` is self-contained:
 *  - `api` (nx serve api) on E2E_API_PORT, global prefix `/api` (main.ts)
 *  - `web` (nx serve web) on E2E_WEB_PORT, whose Vite dev server proxies
 *    `/api/*` to the api port (apps/web/vite.config.mts `server.proxy`)
 * `reuseExistingServer: true` (non-CI) lets servers already running on
 * these ports be reused instead of double-starting; `!process.env.CI` keeps
 * CI runs hermetic by always starting fresh servers.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      // NOTE: deliberately not a bare `nx run api:serve` — @nx/playwright's
      // plugin auto-detects that exact command shape and adds a `dependsOn`
      // on the api:serve task, which then runs BEFORE playwright starts its
      // own webServer, using the default ports/env and colliding with the
      // env-scoped instance below. The harmless trailing flag breaks that
      // pattern match while running the identical command.
      command: 'pnpm exec nx run api:serve --output-style=stream',
      url: `http://localhost:${E2E_API_PORT}/api`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      timeout: 120_000,
      env: {
        API_PORT: E2E_API_PORT,
        WEB_ORIGIN: `http://localhost:${E2E_WEB_PORT}`,
      },
    },
    {
      command: 'pnpm exec nx run web:serve --output-style=stream',
      url: `http://localhost:${E2E_WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      timeout: 120_000,
      env: {
        WEB_PORT: E2E_WEB_PORT,
        API_PORT: E2E_API_PORT,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
