import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';

/**
 * DMTE-84 (Tarefa 5): closes the one AC that Tarefa 4's QA explicitly left
 * open — "salvar [uma permissão] reflete-se de fato num novo login do
 * usuário afetado" (SPEC, critério 4 da Tarefa 4). Real, unmocked flow
 * against the live API + Postgres: a freshly registered user starts without
 * `MANAGE_USERS` (the default AGENT PermissionGroup from
 * `apps/api/prisma/seed.ts` doesn't grant it), so the "Usuários" item of the
 * Configurações submenu is hidden for them — the same shape of gap the SPEC
 * calls out for `VIEW_AND_OPEN_TICKETS`-only users. An admin then creates a
 * PermissionGroup with only `MANAGE_USERS`, links that user to it through
 * the real Grupos de permissões UI (DMTE-84 Tarefa 4), and the user logs in
 * again to prove the grant is live: the menu item appears, and the user can
 * actually open Usuários and flip their own "Usuário ativo" toggle through
 * a real `PATCH /users/:id/active` call.
 */
test.describe('grupo de permissões concede MANAGE_USERS e a mudança reflete num novo login (real API/Postgres)', () => {
  test.use({ actionTimeout: 15000 });

  test('usuário sem MANAGE_USERS não vê Usuários; após vínculo via Grupos de permissões e novo login, vê e opera', async ({
    page,
  }) => {
    test.setTimeout(120000);
    const connectionString = process.env['DATABASE_URL'];
    test.skip(
      process.env['E2E_TESTING'] !== 'true' || !connectionString,
      'Requires explicit local E2E database',
    );
    const database = new URL(connectionString!);
    expect(['localhost', '127.0.0.1']).toContain(database.hostname);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

    const suffix = randomUUID().slice(0, 8);
    const targetEmail = `e2e-perm-target-${suffix}@aponta.com`;
    const targetName = `E2E Perm Target ${suffix}`;
    const groupName = `E2E Gerenciar Usuários ${suffix}`;

    try {
      // 1. A fresh user registers. Default role is AGENT (schema.prisma),
      // whose default PermissionGroup ("Atendente", prisma/seed.ts) does not
      // include MANAGE_USERS.
      await page.goto('/register');
      await page.fill('[name="name"]', targetName);
      await page.fill('[name="email"]', targetEmail);
      await page.fill('[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/', { timeout: 10_000 });

      // Negative case from the SPEC example: no MANAGE_USERS -> the
      // "Usuários" submenu item is hidden (Minha conta always shows).
      await page.goto('/settings');
      await expect(page.getByRole('link', { name: 'Minha conta' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);

      await page.getByRole('button').filter({ hasText: targetEmail }).click();
      await page.getByRole('menuitem', { name: 'Sair' }).click();
      await expect(page).toHaveURL('/login');

      // 2. Admin creates a PermissionGroup with only MANAGE_USERS and links
      // the target user to it, through the real Grupos de permissões UI.
      await page.fill('[name="email"]', 'admin@aponta.com');
      await page.fill('[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');

      await page.goto('/settings/permission-groups');
      await page.getByRole('button', { name: 'Novo grupo' }).click();
      await page.getByLabel('Nome').fill(groupName);
      await page.getByRole('button', { name: 'Criar' }).click();
      await expect(page.getByText(groupName)).toBeVisible();
      await page.getByText(groupName).click();

      await page.getByRole('tab', { name: 'Permissões' }).click();
      await page.getByLabel('Gerenciar usuários', { exact: true }).check();
      const savedPermissions = page.waitForResponse(
        (r) => r.url().includes('/permission-groups/') && r.url().endsWith('/permissions') && r.request().method() === 'PATCH',
      );
      await page.getByRole('button', { name: 'Salvar permissões' }).click();
      expect((await savedPermissions).status()).toBe(200);

      await page.getByRole('tab', { name: 'Vínculos' }).click();
      const availableRow = page
        .locator('div.flex.items-center.gap-2.mb-1')
        .filter({ hasText: targetEmail });
      const linkedUser = page.waitForResponse(
        (r) => r.url().includes('/permission-groups/') && r.url().includes('/users/') && r.request().method() === 'POST',
      );
      await availableRow.getByTitle('Adicionar').click();
      expect((await linkedUser).status()).toBe(201);

      await page.getByRole('button').filter({ hasText: 'admin@aponta.com' }).click();
      await page.getByRole('menuitem', { name: 'Sair' }).click();
      await expect(page).toHaveURL('/login');

      // 3. The target user logs in again. The grant is now live: the
      // "Usuários" item shows up, and the user can open the real Usuários
      // page and operate on it (toggle their own "Usuário ativo").
      await page.fill('[name="email"]', targetEmail);
      await page.fill('[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');

      await page.goto('/settings');
      await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Usuários', exact: true }).click();
      await expect(page).toHaveURL('/settings/users');

      await page.getByPlaceholder('Buscar usuário por nome ou e-mail…').fill(targetName);
      await page.getByRole('button', { name: targetName }).click();

      // A single physical click, not `.uncheck()`'s built-in poll-and-retry:
      // the checkbox is React-controlled from query data (no optimistic
      // update), so it only flips once the PATCH resolves and the query
      // refetches — a retry loop would re-click (and re-toggle) it before
      // that round trip lands.
      const toggle = page.locator('#user-active-toggle');
      await expect(toggle).toBeChecked();
      const activeToggled = page.waitForResponse(
        (r) => r.url().includes('/users/') && r.url().endsWith('/active') && r.request().method() === 'PATCH',
        { timeout: 30_000 },
      );
      await toggle.click();
      expect((await activeToggled).status()).toBe(200);
      await expect(toggle).not.toBeChecked();
      await expect(page.getByText('Inativo', { exact: true })).toBeVisible();
    } finally {
      await prisma.permissionGroupUser.deleteMany({ where: { permissionGroup: { name: groupName } } });
      await prisma.permissionGroup.deleteMany({ where: { name: groupName } });
      await prisma.permissionGroupUser.deleteMany({
        where: { user: { email: targetEmail } },
      });
      await prisma.user.deleteMany({ where: { email: targetEmail } });
      await prisma.$disconnect();
    }
  });
});
