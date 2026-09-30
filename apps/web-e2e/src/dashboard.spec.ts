import { test, expect, type Page } from '@playwright/test';

interface ServiceDesk {
  id: string;
  name: string;
}

/**
 * Logs in as the seeded agent through the real form and returns the JWT
 * from localStorage (persisted by the zustand auth store) so fixture
 * tickets can be created quickly via direct API calls against the real
 * backend — still hitting POST /api/tickets for real, just skipping the
 * create-ticket form UI for setup speed. The filtering assertions
 * themselves always go through the real dashboard UI.
 */
async function loginAndGetToken(page: Page): Promise<string> {
  await page.goto('/login');
  await page.fill('[name="email"]', 'agent@aponta.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');

  const token = await page.evaluate(() => {
    const raw = window.localStorage.getItem('aponta-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed.state?.token ?? null;
  });
  if (!token) {
    throw new Error('Expected a persisted auth token after login');
  }
  return token;
}

async function fetchServiceDesks(
  page: Page,
  token: string,
): Promise<ServiceDesk[]> {
  const response = await page.request.get('/api/service-desks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Finds a seeded service desk by name or throws — avoids non-null
 * assertions at every call site while still failing loudly (with a useful
 * message) if apps/api/prisma/seed.ts ever stops creating the expected
 * fixture desks.
 */
function findServiceDeskOrThrow(
  desks: ServiceDesk[],
  name: string,
): ServiceDesk {
  const desk = desks.find((d) => d.name === name);
  if (!desk) {
    throw new Error(
      `Expected seed.ts to have created a service desk named "${name}"`,
    );
  }
  return desk;
}


async function createTicket(
  page: Page,
  token: string,
  data: { title: string; description: string; serviceDeskId: string },
) {
  const response = await page.request.post('/api/tickets', {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...data, priority: 'MEDIUM' },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('dashboard filtering', () => {
  test('service desk filter narrows the real ticket list', async ({
    page,
  }) => {
    const token = await loginAndGetToken(page);
    const desks = await fetchServiceDesks(page, token);
    const generalDesk = findServiceDeskOrThrow(desks, 'General Support');
    const itDesk = findServiceDeskOrThrow(desks, 'IT Infrastructure');

    const suffix = Date.now();
    const generalTitle = `Dashboard filter general ${suffix}`;
    const itTitle = `Dashboard filter IT ${suffix}`;

    await createTicket(page, token, {
      title: generalTitle,
      description: 'Belongs to General Support.',
      serviceDeskId: generalDesk.id,
    });
    await createTicket(page, token, {
      title: itTitle,
      description: 'Belongs to IT Infrastructure.',
      serviceDeskId: itDesk.id,
    });

    await page.goto('/');
    // Unfiltered: both freshly created tickets are visible.
    await expect(page.getByText(generalTitle)).toBeVisible();
    await expect(page.getByText(itTitle)).toBeVisible();

    // Filter down to IT Infrastructure only.
    await page
      .locator('#filter-service-desk')
      .selectOption({ label: 'IT Infrastructure' });
    await expect(page.getByText(itTitle)).toBeVisible();
    await expect(page.getByText(generalTitle)).toBeHidden();

    // Switch the filter to General Support only.
    await page
      .locator('#filter-service-desk')
      .selectOption({ label: 'General Support' });
    await expect(page.getByText(generalTitle)).toBeVisible();
    await expect(page.getByText(itTitle)).toBeHidden();

    // Clear the filter: both are visible again.
    await page
      .locator('#filter-service-desk')
      .selectOption({ label: 'All service desks' });
    await expect(page.getByText(generalTitle)).toBeVisible();
    await expect(page.getByText(itTitle)).toBeVisible();
  });

  test('status filter narrows the real ticket list', async ({ page }) => {
    const token = await loginAndGetToken(page);
    const desks = await fetchServiceDesks(page, token);
    const generalDesk = findServiceDeskOrThrow(desks, 'General Support');

    const uniqueTitle = `Dashboard status filter ${Date.now()}`;
    // Every ticket is created with status OPEN by TicketsService.create;
    // nothing in this app ever transitions it, so it stays OPEN for the
    // life of the test run — safe to assert against both ends of the
    // status filter.
    await createTicket(page, token, {
      title: uniqueTitle,
      description: 'Used to verify the status filter.',
      serviceDeskId: generalDesk.id,
    });

    await page.goto('/');
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    await page.locator('#filter-status').selectOption({ label: 'Open' });
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    await page.locator('#filter-status').selectOption({ label: 'Closed' });
    await expect(page.getByText(uniqueTitle)).toBeHidden();

    await page.locator('#filter-status').selectOption({ label: 'All statuses' });
    await expect(page.getByText(uniqueTitle)).toBeVisible();
  });
});
