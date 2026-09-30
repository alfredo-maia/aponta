import { test, expect } from '@playwright/test';

/**
 * Real, unmocked auth flow against the live API + Postgres. Two scenarios:
 *  1. A brand-new user registers (unique email per run to avoid colliding
 *     with previous runs / other specs) and lands on the dashboard, proving
 *     POST /api/auth/register + the auto-login POST /api/auth/login work
 *     end-to-end through the Vite dev-server proxy.
 *  2. The seeded agent (apps/api/prisma/seed.ts) logs in directly, matching
 *     the brief's example spec.
 */
test.describe('authentication', () => {
  test('a new user can register and land on the dashboard', async ({
    page,
  }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@aponta.com`;

    await page.goto('/register');
    await page.fill('[name="name"]', 'E2E Register User');
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Registration triggers two sequential requests (register, then
    // auto-login) before navigating, so give this a bit more headroom than
    // the default 5s assertion timeout.
    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Chamados' })).toBeVisible();
  });

  test('the seeded agent can login and see the dashboard', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'agent@aponta.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Chamados' })).toBeVisible();
    // Sidebar shows the signed-in user's email, sourced from the real JWT
    // returned by POST /api/auth/login and decoded client-side.
    await expect(page.getByText('agent@aponta.com')).toBeVisible();
  });

  test('an invalid login shows an error and stays on /login', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'agent@aponta.com');
    await page.fill('[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha inválidos.',
    );
    await expect(page).toHaveURL('/login');
  });
});
