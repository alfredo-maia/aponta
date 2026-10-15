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

    // "Novo Ticket" is a highlighted action BUTTON in the DS sidebar, not a
    // plain NavLink (Issue #48's acceptance criteria).
    await page.getByRole('button', { name: 'Novo Ticket' }).click();
    await expect(page).toHaveURL('/tickets/new');
    await expect(page.locator('#ticket-service-desk')).toBeVisible();

    await page.fill('#ticket-title', uniqueTitle);
    // EzRichText is a Tiptap contenteditable surface, not a <textarea>.
    await page.locator('[data-testid="ticket-description"] [contenteditable="true"]').fill(description);
    // Seeded by apps/api/prisma/seed.ts; real GET /api/service-desks populates
    // this <select>, so the option only exists once that request resolves.
    await page
      .locator('#ticket-service-desk')
      .selectOption({ label: 'General Support' });
    await page.locator('#ticket-priority').selectOption({ label: 'Alta' });
    await page.getByRole('button', { name: 'Abrir Ticket' }).click();

    // POST /api/tickets succeeds -> navigate(`/tickets/${ticket.id}`).
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/, { timeout: 10000 });

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
    await page.locator('[data-testid="ticket-description"] [contenteditable="true"]').fill('Verifies GET /api/tickets/:id.');
    await page
      .locator('#ticket-service-desk')
      .selectOption({ label: 'General Support' });
    await page.getByRole('button', { name: 'Abrir Ticket' }).click();
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/, { timeout: 10000 });

    const detailUrl = page.url();

    // Full reload: re-fetches the ticket from the real API via GET
    // /api/tickets/:id rather than relying on client-side cache/navigation
    // state left over from the create mutation.
    await page.reload();
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();
    expect(page.url()).toBe(detailUrl);
  });

  test('an agent can assign a ticket', async ({ page }) => {
    await loginAsSeededAgent(page);

    const uniqueTitle = `Chamado para atribuição ${Date.now()}`;
    await page.goto('/tickets/new');
    await page.fill('#ticket-title', uniqueTitle);
    await page.locator('[data-testid="ticket-description"] [contenteditable="true"]').fill('Preciso de ajuda com a atribuição.');
    await page.locator('#ticket-service-desk').selectOption({ label: 'General Support' });
    await page.getByRole('button', { name: 'Abrir Ticket' }).click();
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/, { timeout: 10000 });

    // 3. Look for the assignment dropdown (seeded agent is already logged
    // in, so this ticket's requester IS the agent — assignment doesn't
    // require a second CLIENT identity like the old spec simulated).
    const assignSelect = page.getByLabel(/atribuído a:/i);
    await expect(assignSelect).toBeVisible();

    // 4. Assign it to the seeded agent itself.
    await assignSelect.selectOption({ label: 'Seed Agent' });

    // 5. Verify the selection persisted after a full reload
    await page.reload();
    await expect(page.getByLabel(/atribuído a:/i)).toHaveValue(/^[0-9a-fA-F-]+$/); // It should have the UUID of the Agent
  });
});
