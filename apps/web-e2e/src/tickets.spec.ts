import { test, expect, type Page } from '@playwright/test';

/**
 * Logs in through the real login form as the seeded agent
 * (apps/api/prisma/seed.ts) and waits for the dashboard to load. AGENT can
 * see and create tickets against any service desk (no CLIENT ownership
 * restriction), which is what these specs need.
 */
async function loginAsSeededAgent(page: Page) {
  await page.goto('/login');
  await page.fill('[name="email"]', 'agent@aponta.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

test.describe('ticket creation and detail view', () => {
  test('creating a ticket via the real form shows it on its detail page', async ({
    page,
  }) => {
    await loginAsSeededAgent(page);

    const uniqueTitle = `E2E ticket ${Date.now()}`;
    const description = 'Created by the tickets.spec.ts E2E test.';

    await page.getByRole('link', { name: 'Novo Chamado' }).click();
    await expect(page).toHaveURL('/tickets/new');

    await page.fill('#ticket-title', uniqueTitle);
    await page.fill('#ticket-description', description);
    // Seeded by apps/api/prisma/seed.ts; real GET /api/service-desks populates
    // this <select>, so the option only exists once that request resolves.
    await page
      .locator('#ticket-service-desk')
      .selectOption({ label: 'General Support' });
    await page.locator('#ticket-priority').selectOption({ label: 'Alta' });
    await page.getByRole('button', { name: 'Criar chamado' }).click();

    // POST /api/tickets succeeds -> navigate(`/tickets/${ticket.id}`).
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/);

    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Alta')).toBeVisible();
    // Server-assigned fields prove this came from the real API, not a mock:
    // protocol format AP-<year>-<seq> (see tickets.service.ts) and OPEN status.
    await expect(page.getByText(/^AP-\d{4}-\d{4}$/)).toBeVisible();
    // Status renders as a <select> for agents (TicketDetail.tsx), so the
    // "Aberto" <option> text is not an independently visible DOM node even
    // when selected — assert the select's value instead of its text.
    await expect(page.locator('#ticket-status')).toHaveValue('OPEN');
  });

  test('a freshly created ticket is retrievable by reloading its detail URL', async ({
    page,
  }) => {
    await loginAsSeededAgent(page);

    const uniqueTitle = `E2E reload ticket ${Date.now()}`;

    await page.goto('/tickets/new');
    await page.fill('#ticket-title', uniqueTitle);
    await page.fill('#ticket-description', 'Verifies GET /api/tickets/:id.');
    await page
      .locator('#ticket-service-desk')
      .selectOption({ label: 'General Support' });
    await page.getByRole('button', { name: 'Criar chamado' }).click();
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/);

    const detailUrl = page.url();

    // Full reload: re-fetches the ticket from the real API via GET
    // /api/tickets/:id rather than relying on client-side cache/navigation
    // state left over from the create mutation.
    await page.reload();
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();
    expect(page.url()).toBe(detailUrl);
  });

  test('an agent can assign a ticket', async ({ page }) => {
    // 1. Register dynamically a new client
    const uniqueClientEmail = `client-${Date.now()}@aponta.com`;
    await page.goto('/register');
    await page.fill('#name', 'Dynamic Client');
    await page.fill('#email', uniqueClientEmail);
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    await page.goto('/tickets/new');
    const uniqueTitle = `Chamado para atribuição ${Date.now()}`;
    await page.fill('#ticket-title', uniqueTitle);
    await page.fill('#ticket-description', 'Preciso de ajuda com a atribuição.');
    await page.locator('#ticket-service-desk').selectOption({ label: 'General Support' });
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL('/tickets/new', { timeout: 10000 });
    
    // Save the ticket URL so we can go directly to it
    const ticketUrl = page.url();

    // Log out from Client
    await page.locator('.rounded-full.bg-primary').click(); // Avatar
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/login');

    // 2. Log in as an AGENT
    await page.fill('[name="email"]', 'agent@aponta.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Go directly to the ticket URL
    await page.goto(ticketUrl);

    // 3. Look for the assignment dropdown
    const assignSelect = page.getByLabel(/atribuído a:/i);
    await expect(assignSelect).toBeVisible();

    // 4. Assign it to 'Demo Agent'
    // The seeded script names it "Seed Agent"
    await assignSelect.selectOption({ label: 'Seed Agent' });

    // Wait a brief moment for the react-query mutation cache invalidation to settle
    await page.waitForTimeout(500);

    // 5. Verify the selection persisted after a full reload
    await page.reload();
    await expect(page.getByLabel(/atribuído a:/i)).toHaveValue(/^[0-9a-fA-F-]+$/); // It should have the UUID of the Agent
  });
});
