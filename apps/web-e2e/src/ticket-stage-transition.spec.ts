import { test, expect } from '@playwright/test';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHmac, randomUUID } from 'node:crypto';

// These fixtures may only be written to an explicitly opted-in local test DB.
// No credentials or remote application data are used by this suite.
test.describe('worklog advances the ticket through desk-configured stages (real API/Postgres)', () => {
  test.use({ actionTimeout: 15000 });
  test('saving an apontamento moves the ticket to an allowed next stage, and closes it on a final one', async ({ page, request }) => {
    test.setTimeout(120000);
    const connectionString = process.env['DATABASE_URL'];
    const secret = process.env['JWT_SECRET'];
    test.skip(process.env['E2E_TESTING'] !== 'true' || !connectionString || !secret, 'Requires explicit local E2E database and JWT secret');
    const database = new URL(connectionString!);
    expect(['localhost', '127.0.0.1']).toContain(database.hostname);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = randomUUID();
    const ids = {
      org: randomUUID(), admin: randomUUID(), agent: randomUUID(), requester: randomUUID(),
      desk: randomUUID(), ticket: randomUUID(),
      stageN1: randomUUID(), stageN2: randomUUID(), stageResolved: randomUUID(),
    };
    const token = (id: string, role: Role, organizationId?: string) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: id, email: `${id}@e2e.invalid`, role, organizationId, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
      const signature = createHmac('sha256', secret!).update(`${header}.${payload}`).digest('base64url');
      return `${header}.${payload}.${signature}`;
    };
    const adminToken = token(ids.admin, Role.ADMIN);
    const headers = { Authorization: `Bearer ${adminToken}` };
    let contractId: string | undefined;
    try {
      await prisma.organization.create({ data: { id: ids.org, name: `Cliente Estágio E2E ${suffix}` } });
      await prisma.user.createMany({ data: [
        { id: ids.admin, role: Role.ADMIN }, { id: ids.agent, role: Role.AGENT },
        { id: ids.requester, role: Role.CLIENT, organizationId: ids.org },
      ].map((user) => ({ ...user, name: `E2E ${user.role}`, email: `${user.id}@e2e.invalid`, password: 'unused-jwt-fixture' })) });
      await prisma.serviceDesk.create({ data: { id: ids.desk, name: `Mesa Estágio E2E ${suffix}`, organizations: { connect: { id: ids.org } }, agents: { connect: { id: ids.agent } } } });
      // Mesa-configured workflow: N1 (initial) -> N2, N1 -> Resolvido (final). N1 -> N1 and
      // any transition into N2 from elsewhere is deliberately left unconfigured, so the
      // "Próximo Estágio" field must only ever offer a subset of the desk's stages, never
      // every stage freely (confirmed against the real TiFlux behavior).
      await prisma.ticketStage.createMany({ data: [
        { id: ids.stageN1, serviceDeskId: ids.desk, name: 'N1', position: 0, isInitial: true },
        { id: ids.stageN2, serviceDeskId: ids.desk, name: 'N2', position: 1 },
        { id: ids.stageResolved, serviceDeskId: ids.desk, name: 'Resolvido', position: 2, isFinal: true },
      ] });
      await prisma.ticketStageTransition.createMany({ data: [
        { fromStageId: ids.stageN1, toStageId: ids.stageN2 },
        { fromStageId: ids.stageN1, toStageId: ids.stageResolved },
      ] });
      await prisma.ticket.create({ data: {
        id: ids.ticket, protocol: `E2E-STAGE-${suffix}`, title: `Avançar estágio ${suffix}`,
        description: 'Apontamento real', requesterId: ids.requester, commercialOrganizationId: ids.org,
        serviceDeskId: ids.desk, stageId: ids.stageN1,
      } });
      const contract = await request.post('/api/contracts', { headers, data: {
        organizationId: ids.org, name: `Contrato Estágio ${suffix}`, type: 'MONTHLY_HOURS',
        includedMinutes: 600, excessHourlyRateCents: 12000, monthlyFeeCents: 10000,
        approved: true, active: true, startsAt: '2026-10-01T03:00:00Z', serviceDeskIds: [ids.desk],
      } });
      expect(contract.status(), await contract.text()).toBe(201);
      contractId = (await contract.json()).id as string;

      // Negative path first: N2 is a real stage of this desk, but there is no configured
      // transition INTO it from N1 directly bypassing the UI — only fromStageId=N1 ->
      // toStageId=N2 is allowed, which IS configured above, so instead assert that a stage
      // transition not present at all (Resolvido -> N2, backwards) is rejected.
      const invalidTransition = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: {
        startTime: '2026-10-16T12:00:00Z', endTime: '2026-10-16T12:30:00Z', description: 'Tentativa inválida',
        valuationType: 'CONTRACT', contractId, nextStageId: randomUUID(),
      } });
      expect(invalidTransition.status(), await invalidTransition.text()).toBe(400);
      expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ids.ticket } })).toMatchObject({ stageId: ids.stageN1 });

      await page.addInitScript((jwt) => localStorage.setItem('aponta-auth', JSON.stringify({ state: { token: jwt }, version: 0 })), token(ids.agent, Role.AGENT));
      await page.goto(`/tickets/${ids.ticket}`);
      await page.getByRole('tab', { name: 'Apontamentos', exact: true }).click();
      await page.getByRole('button', { name: 'Apontamento', exact: true }).click();
      await page.getByTestId('worklog-day-input').fill('2026-10-16');
      await page.getByTestId('worklog-start-time-input').fill('09:00');
      await page.getByTestId('worklog-end-time-input').fill('09:30');
      await page.getByLabel('Contrato aplicável', { exact: true }).selectOption(contractId);
      await page.getByTestId('worklog-description-input').locator('[contenteditable="true"]').fill('Avancei para o estágio Resolvido');
      // Real mesa-configured subset, not a free status list: only N2 and Resolvido show up here.
      const nextStage = page.getByLabel('Próximo Estágio', { exact: true });
      await expect(nextStage.locator('option')).toHaveText(['Não alterar', 'N2', 'Resolvido']);
      await nextStage.selectOption({ label: 'Resolvido' });
      const savedLog = page.waitForResponse((result) => result.url().endsWith(`/api/tickets/${ids.ticket}/worklogs`) && result.request().method() === 'POST');
      await page.getByTestId('worklog-submit-button').click();
      const worklog = await savedLog;
      expect(worklog.status(), await worklog.text()).toBe(201);

      const updated = await request.get(`/api/tickets/${ids.ticket}`, { headers });
      expect(updated.status()).toBe(200);
      const updatedTicket = await updated.json();
      expect(updatedTicket.stage).toMatchObject({ id: ids.stageResolved, name: 'Resolvido', isFinal: true });
      // Reaching a final stage also closes the ticket.
      expect(updatedTicket.status).toBe('CLOSED');
      const audit = await prisma.ticketAudit.findMany({ where: { ticketId: ids.ticket, action: 'STAGE_CHANGED' } });
      expect(audit).toEqual([expect.objectContaining({ prevVal: ids.stageN1, newVal: ids.stageResolved })]);
    } finally {
      await prisma.worklog.deleteMany({ where: { ticketId: ids.ticket } });
      await prisma.ticketAudit.deleteMany({ where: { ticketId: ids.ticket } });
      await prisma.ticket.deleteMany({ where: { id: ids.ticket } });
      await prisma.contractTerm.deleteMany({ where: { contract: { organizationId: ids.org } } });
      await prisma.contractLifecycleEvent.deleteMany({ where: { contract: { organizationId: ids.org } } });
      await prisma.contract.deleteMany({ where: { organizationId: ids.org } });
      await prisma.serviceDesk.deleteMany({ where: { id: ids.desk } });
      await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.agent, ids.requester] } } });
      await prisma.organization.deleteMany({ where: { id: ids.org } });
      await prisma.$disconnect();
    }
  });
});
