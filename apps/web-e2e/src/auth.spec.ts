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

  test('a user can change their password and log in with the new one', async ({
    page,
  }) => {
    const uniqueEmail = `e2e-change-password-${Date.now()}@aponta.com`;

    // Register a fresh user (auto-logs in) rather than reusing the seeded
    // agent, so this spec never collides with a password already changed
    // by a previous run.
    await page.goto('/register');
    await page.fill('[name="name"]', 'E2E Change Password User');
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'OldPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    await page.goto('/my-account');
    await page.getByRole('tab', { name: 'Segurança' }).click();
    await page.fill('#currentPassword', 'OldPassword123!');
    await page.fill('#newPassword', 'NewPassword456!');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Senha atualizada com sucesso!')).toBeVisible();

    // Log out, then prove the old password no longer works and the new
    // one does — the only real proof the API actually persisted the hash.
    // "Sair" now lives inside the top-right user-menu dropdown (mirrors
    // the Tiflux reference UI), so open it before clicking.
    await page.getByText(uniqueEmail).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/login');

    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'OldPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha inválidos.',
    );

    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'NewPassword456!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('a user can update their name and email from Minha Conta', async ({
    page,
  }) => {
    const uniqueEmail = `e2e-update-profile-${Date.now()}@aponta.com`;
    const updatedEmail = `e2e-update-profile-${Date.now()}-updated@aponta.com`;

    await page.goto('/register');
    await page.fill('[name="name"]', 'E2E Update Profile User');
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    await page.goto('/my-account');
    // Minha Conta is the default tab — profile fields are visible right away.
    await page.fill('#name', 'Nome Atualizado');
    await page.fill('#email', updatedEmail);
    await page.click('button[type="submit"]');

    await expect(page.getByText('Dados atualizados com sucesso!')).toBeVisible();

    // Log out and log back in with the NEW email to prove the API actually
    // persisted it (old email should no longer work). The top-right menu
    // still shows the OLD email because the JWT wasn't refreshed by the
    // profile update — that's expected until the user logs in again.
    await page.getByText(uniqueEmail).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/login');

    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha inválidos.',
    );

    await page.fill('[name="email"]', updatedEmail);
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });
});
