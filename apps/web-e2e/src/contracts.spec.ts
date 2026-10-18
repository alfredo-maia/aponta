import { test, expect } from '@playwright/test';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHmac, randomUUID } from 'node:crypto';

// These fixtures may only be written to an explicitly opted-in local test DB.
// No credentials or remote application data are used by this suite.
test.describe('contracts and recorded valuation (real API/Postgres)', () => {
  test.use({ actionTimeout: 15000 });
  test('admin creates contract, values excess, preserves history and protects financial data', async ({ page, request }) => {
    test.setTimeout(120000);
    const connectionString = process.env['DATABASE_URL'];
    const secret = process.env['JWT_SECRET'];
    test.skip(process.env['E2E_TESTING'] !== 'true' || !connectionString || !secret, 'Requires explicit local E2E database and JWT secret');
    const database = new URL(connectionString!);
    expect(['localhost', '127.0.0.1']).toContain(database.hostname);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = randomUUID();
    const ids = { org: randomUUID(), otherOrg: randomUUID(), admin: randomUUID(), agent: randomUUID(), master: randomUUID(), outsider: randomUUID(), requester: randomUUID(), desk: randomUUID(), ticket: randomUUID() };
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
      await prisma.organization.createMany({ data: [{ id: ids.org, name: `Cliente E2E ${suffix}` }, { id: ids.otherOrg, name: `Outro E2E ${suffix}` }] });
      await prisma.user.createMany({ data: [
        { id: ids.admin, role: Role.ADMIN }, { id: ids.agent, role: Role.AGENT },
        { id: ids.master, role: Role.CLIENT_MASTER, organizationId: ids.org },
        { id: ids.outsider, role: Role.CLIENT_MASTER, organizationId: ids.otherOrg },
        { id: ids.requester, role: Role.CLIENT, organizationId: ids.org },
      ].map((user) => ({ ...user, name: `E2E ${user.role}`, email: `${user.id}@e2e.invalid`, password: 'unused-jwt-fixture' })) });
      await prisma.serviceDesk.create({ data: { id: ids.desk, name: `Mesa E2E ${suffix}`, organizations: { connect: { id: ids.org } }, agents: { connect: { id: ids.agent } } } });
      await prisma.ticket.create({ data: { id: ids.ticket, protocol: `E2E-${suffix}`, title: `Valorização ${suffix}`, description: 'Apontamento real', requesterId: ids.requester, commercialOrganizationId: ids.org, serviceDeskId: ids.desk } });
      await page.addInitScript((jwt) => localStorage.setItem('aponta-auth', JSON.stringify({ state: { token: jwt }, version: 0 })), adminToken);
      await page.goto('/contracts');
      await page.getByRole('button', { name: 'Novo contrato', exact: true }).click({ timeout: 30000 });
      await page.getByLabel('Nome do contrato', { exact: true }).fill(`Contrato ${suffix}`);
      await page.getByRole('combobox', { name: 'Empresa*', exact: true }).selectOption(ids.org);
      await page.getByLabel('Modalidade', { exact: true }).selectOption('MONTHLY_HOURS');
      await page.getByLabel('Início da vigência', { exact: true }).fill('2026-10-01');
      await page.getByLabel('Condições comerciais aprovadas', { exact: true }).check();
      await page.getByRole('checkbox', { name: `Mesa E2E ${suffix}`, exact: true }).check();
      await page.getByLabel('Franquia mensal (horas)', { exact: true }).fill('0.5');
      await page.getByLabel('Valor mensal (R$)', { exact: true }).fill('100');
      await page.getByLabel('Hora excedente (R$)', { exact: true }).fill('120');
      const created = page.waitForResponse((response) => response.url().endsWith('/api/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
      const response = await created;
      expect(response.status()).toBe(201);
      contractId = (await response.json()).id;
      expect(contractId).toBeTruthy();
      await page.goto(`/tickets/${ids.ticket}`);
      await page.getByRole('tab', { name: 'Apontamentos', exact: true }).click();
      await page.getByRole('button', { name: 'Apontamento', exact: true }).click();
      await page.getByTestId('worklog-day-input').fill('2026-10-15');
      await page.getByTestId('worklog-start-time-input').fill('09:00');
      await page.getByTestId('worklog-end-time-input').fill('10:00');
      await page.getByLabel('Contrato aplicável', { exact: true }).selectOption(contractId!);
      await page.getByTestId('worklog-description-input').locator('[contenteditable="true"]').fill('Metade coberta, metade excedente');
      const savedLog = page.waitForResponse((result) => result.url().endsWith(`/api/tickets/${ids.ticket}/worklogs`) && result.request().method() === 'POST');
      await page.getByTestId('worklog-submit-button').click();
      const worklog = await savedLog;
      expect(worklog.status(), await worklog.text()).toBe(201);
      expect(await worklog.json()).toMatchObject({ minutes: 60, valueCents: 6000, contractId });
      const billing = await request.get(`/api/reports/billing?contractId=${contractId}`, { headers });
      expect(billing.status()).toBe(200);
      expect(await billing.json()).toEqual([expect.objectContaining({ organizationId: ids.org, coveredMinutes: 30, excessMinutes: 30, totalValueCents: 6000, unknownValuationCount: 0 })]);
      await page.goto('/reports');
      await page.getByRole('tab', { name: 'Faturamento Base' }).click();
      await page.getByLabel('Contrato', { exact: true }).selectOption(contractId!);
      const reportRow = page.getByRole('row').filter({ hasText: `Cliente E2E ${suffix}` });
      await expect(reportRow).toContainText('0h 30m / 0h 30m');
      await expect(reportRow).toContainText(/R\$\s*60,00/);
      // Changing the contract must not reprice recorded work.
      const update = await request.post(`/api/contracts/${contractId}/update`, { headers, data: { excessHourlyRateCents: 99900, conditionsEffectiveAt: '2026-11-01T03:00:00Z' } });
      expect(update.ok(), await update.text()).toBeTruthy();
      const preserved = await request.get(`/api/reports/billing?contractId=${contractId}`, { headers });
      expect((await preserved.json())[0].totalValueCents).toBe(6000);
      const agentHeaders = { Authorization: `Bearer ${token(ids.agent, Role.AGENT)}` };
      expect((await request.get('/api/reports/billing', { headers: agentHeaders })).status()).toBe(403);
      const agentLogs = await request.get(`/api/tickets/${ids.ticket}/worklogs`, { headers: agentHeaders });
      expect(agentLogs.status()).toBe(200);
      const masked = await agentLogs.json();
      expect(masked).toHaveLength(1);
      expect(masked[0].value).toBeNull();
      expect(masked[0].valueCents).toBeNull();
      expect(masked[0].valuationSnapshot).toBeNull();
      expect(JSON.stringify(masked)).not.toContain('amountCents');
      const ownReport = await request.get(`/api/reports/billing?contractId=${contractId}`, { headers: { Authorization: `Bearer ${token(ids.master, Role.CLIENT_MASTER, ids.org)}` } });
      expect((await ownReport.json())[0].totalValueCents).toBe(6000);
      const otherHeaders = { Authorization: `Bearer ${token(ids.outsider, Role.CLIENT_MASTER, ids.otherOrg)}` };
      const foreignReport = await request.get(`/api/reports/billing?contractId=${contractId}`, { headers: otherHeaders });
      expect(foreignReport.status()).toBe(200);
      expect(await foreignReport.json()).toEqual([]);
      expect((await request.get(`/api/contracts/${contractId}`, { headers: otherHeaders })).status()).toBe(404);

      const createContract = async (organizationId: string, name: string) => {
        const createdContract = await request.post('/api/contracts', { headers, data: { organizationId, name, type: 'MONTHLY_HOURS', includedMinutes: 60, excessHourlyRateCents: 12000, monthlyFeeCents: 10000, approved: organizationId === ids.org, active: organizationId === ids.org, startsAt: '2026-10-01T03:00:00Z', serviceDeskIds: organizationId === ids.org ? [ids.desk] : [] } });
        expect(createdContract.status(), await createdContract.text()).toBe(201);
        return (await createdContract.json()).id as string;
      };
      const concurrentContract = await createContract(ids.org, `Concorrência ${suffix}`);
      const foreignContract = await createContract(ids.otherOrg, `Outro contrato ${suffix}`);
      const logData = { startTime: '2026-10-16T12:00:00Z', endTime: '2026-10-16T13:00:00Z', description: 'Concorrência real', valuationType: 'CONTRACT' };
      const concurrent = await Promise.all([1, 2].map(() => request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: { ...logData, contractId: concurrentContract } })));
      for (const result of concurrent) expect(result.status(), await result.text()).toBe(201);
      const concurrentValues = await Promise.all(concurrent.map((result) => result.json()));
      expect(concurrentValues.map((log) => log.valueCents).sort((a, b) => a - b)).toEqual([0, 12000]);
      expect(concurrentValues.reduce((sum, log) => sum + log.valuationSnapshot.segments[0].coveredMinutes, 0)).toBe(60);
      const ambiguous = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: logData });
      expect(ambiguous.status(), await ambiguous.text()).toBe(400);
      const foreign = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: { ...logData, contractId: foreignContract } });
      expect(foreign.status(), await foreign.text()).toBe(400);
      const countBefore = await prisma.worklog.count({ where: { ticketId: ids.ticket } });
      const rollback = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: { ...logData, contractId: concurrentContract, nextStatus: 'RESOLVED', sendAsReply: true } });
      expect(rollback.status(), await rollback.text()).toBe(400);
      expect(await prisma.worklog.count({ where: { ticketId: ids.ticket } })).toBe(countBefore);
      expect(await prisma.comment.count({ where: { ticketId: ids.ticket } })).toBe(0);
      const forbiddenBonus = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers: agentHeaders, data: { ...logData, contractId: concurrentContract, valuationType: 'BONUS', bonusReason: 'Retrabalho autorizado' } });
      expect(forbiddenBonus.status(), await forbiddenBonus.text()).toBe(403);
      const guarantee = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: { ...logData, contractId: concurrentContract, valuationType: 'GUARANTEE', bonusReason: 'Retrabalho autorizado' } });
      expect(guarantee.status(), await guarantee.text()).toBe(201);
      expect(await guarantee.json()).toMatchObject({ billable: false, valueCents: 0, contractId: concurrentContract });
      const forbiddenManual = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers: agentHeaders, data: { ...logData, contractId: concurrentContract, valuationType: 'MANUAL', value: 10 } });
      expect(forbiddenManual.status(), await forbiddenManual.text()).toBe(403);
      const manual = await request.post(`/api/tickets/${ids.ticket}/worklogs`, { headers, data: { ...logData, contractId: concurrentContract, valuationType: 'MANUAL', value: 10 } });
      expect(manual.status(), await manual.text()).toBe(201);
      expect(await manual.json()).toMatchObject({ valueCents: 1000, billable: true });
    } finally {
      await prisma.worklog.deleteMany({ where: { ticketId: ids.ticket } });
      await prisma.comment.deleteMany({ where: { ticketId: ids.ticket } });
      await prisma.ticketAudit.deleteMany({ where: { ticketId: ids.ticket } });
      await prisma.ticket.deleteMany({ where: { id: ids.ticket } });
      await prisma.contractTerm.deleteMany({ where: { contract: { organizationId: { in: [ids.org, ids.otherOrg] } } } });
      await prisma.contractLifecycleEvent.deleteMany({ where: { contract: { organizationId: { in: [ids.org, ids.otherOrg] } } } });
      await prisma.contract.deleteMany({ where: { organizationId: { in: [ids.org, ids.otherOrg] } } });
      await prisma.serviceDesk.deleteMany({ where: { id: ids.desk } });
      await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.agent, ids.master, ids.outsider, ids.requester] } } });
      await prisma.organization.deleteMany({ where: { id: { in: [ids.org, ids.otherOrg] } } });
      await prisma.$disconnect();
    }
  });
});
