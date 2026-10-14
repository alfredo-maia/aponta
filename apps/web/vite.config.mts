/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => {
  // Overridable via env for environments where the default dev port is
  // already occupied by something unrelated to this repo (e.g. this host
  // runs a separate process on :3000) — apps/web-e2e/playwright.config.ts
  // sets WEB_PORT/API_PORT when spawning its own webServer processes so
  // `pnpm nx e2e web-e2e` still works without clashing. Plain `pnpm dev`
  // is unaffected and keeps using the .env defaults (3000/3001).
  const webPort = Number(process.env.WEB_PORT) || 3000;
  const apiPort = Number(process.env.API_PORT) || 3001;

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    server: {
      port: webPort,
      host: 'localhost',
      // Dev-only proxy: apps/web/src/lib/api.ts calls a root-relative `/api`
      // baseURL, assuming same-origin service. The NestJS API (apps/api) sets
      // a global `api` prefix (see apps/api/src/main.ts); forward `/api/*`
      // there during `serve`/E2E. Vitest unit tests mock `api.ts` entirely
      // and never hit this proxy.
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
        '/uploads': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: webPort,
      host: 'localhost',
    },
    plugins: [react(), tailwindcss(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    // Uncomment this if you are using workers.
    // worker: {
    //   plugins: () => [ nxViteTsPaths() ],
    // },
    build: {
      outDir: '../../dist/apps/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    test: {
      name: 'web',
      watch: false,
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/web',
        provider: 'v8' as const,
        // Enforced via `--coverage` in CI (see .github/workflows/ci.yml).
        // Thresholds are set a few points below the measured baseline
        // (see `pnpm nx run web:test -- --coverage`) so genuine
        // regressions fail the build without false-failing on normal
        // day-to-day branch-coverage noise.
        thresholds: {
          statements: 84,
          branches: 78,
          functions: 81,
          lines: 86,
        },
      },
    },
  };
});
