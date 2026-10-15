import { test, expect, type Page } from '@playwright/test';

async function loginAsSeededAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@aponta.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('admin Mesa screen', () => {
  test('ADMIN opens Mesa, creates a desk, and sees TiFlux-parity tabs', async ({
    page,
  }) => {
    await loginAsSeededAdmin(page);

    await expect(page.getByRole('button', { name: 'Mesa' })).toBeVisible();
    await page.getByRole('button', { name: 'Mesa' }).click();
    await expect(page).toHaveURL(/\/service-desks/);
    await expect(page.getByRole('heading', { name: 'Mesa' })).toBeVisible();

    const uniqueName = `Mesa E2E ${Date.now()}`;
    await page.getByTestId('ez-toolbar-insert-button').click();
    await page.locator('#service-desk-name').fill(uniqueName);
    await page.getByRole('button', { name: /criar/i }).click();

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
    await page.getByText(uniqueName).click();

    await expect(page.getByRole('tab', { name: 'Informações básicas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Parâmetros' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Campos obrigatórios' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Reabertura' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Estágio' })).toBeEnabled();
    await page.getByRole('tab', { name: 'Estágio' }).click();
    await expect(page.getByLabel('Novo estágio')).toBeVisible();
    await expect(page.getByText(/Pendente \(inicial\)/)).toBeVisible();

    await page.getByRole('tab', { name: 'Parâmetros' }).click();
    await expect(page.getByLabel('Interação com outras mesas')).toBeVisible();
    await page.getByLabel('Interação com outras mesas').check();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByLabel('Interação com outras mesas')).toBeChecked();
  });
});
