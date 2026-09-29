import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Loads .env from the monorepo root or apps/api depending on cwd (Nx / CLI).
loadEnv({
  path: [
    resolve(__dirname, '../../.env.local'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '.env.local'),
    resolve(__dirname, '.env'),
  ],
});

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
