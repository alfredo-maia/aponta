import { test, expect } from '@playwright/test';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHmac, randomUUID } from 'node:crypto';
import { linkFixtureUserToDefaultPermissionGroup } from './support/permission-groups';

test('commercial modalities, immutable costs, mandatory gate and stoppable timers (real Postgres)', async ({ request }) => {
  test.setTimeout(150000);
  const connectionString = process.env['DATABASE_URL'];
  const secret = process.env['JWT_SECRET'];
  test.skip(process.env['E2E_TESTING'] !== 'true' || !connectionString || !secret, 'Explicit local test database required');
  expect(['localhost', '127.0.0.1']).toContain(new URL(connectionString!).hostname);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const id = { org: randomUUID(), admin: randomUUID(), agent: randomUUID(), master: randomUUID(), requester: randomUUID(), desk: randomUUID(), ticket: randomUUID() };
  const token = (userId: string, role: Role) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: userId, email: `${userId}@e2e.invalid`, role, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url');
    return `${header}.${payload}.${createHmac('sha256', secret!).update(`${header}.${payload}`).digest('base64url')}`;
  };
  const headers = { Authorization: `Bearer ${token(id.admin, Role.ADMIN)}` };
  const agentHeaders = { Authorization: `Bearer ${token(id.agent, Role.AGENT)}` };
  const masterHeaders = { Authorization: `Bearer ${token(id.master, Role.CLIENT_MASTER)}` };
  const work = { startTime: '2026-10-15T12:00:00Z', endTime: '2026-10-15T13:00:00Z', description: 'Esforço real E2E', valuationType: 'CONTRACT' };
  const postLog = (data: Record<string, unknown>, actorHeaders = headers) => request.post(`/api/tickets/${id.ticket}/worklogs`, { headers: actorHeaders, data: { ...work, ...data } });
  const createContract = async (type: string, fields: Record<string, unknown> = {}) => {
    const response = await request.post('/api/contracts', { headers, data: { organizationId: id.org, name: `E2E ${type} ${id.org}`, type, active: true, approved: true, startsAt: '2026-10-01T03:00:00Z', serviceDeskIds: [id.desk], ...fields } });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json()).id as string;
  };
  const commercial = async (contractId: string, month?: string) => {
    const response = await request.get(`/api/reports/commercial?contractId=${contractId}${month ? `&month=${month}` : ''}`, { headers });
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json())[0];
  };
  try {
    await db.organization.create({ data: { id: id.org, name: `Comercial E2E ${id.org}` } });
    await db.user.createMany({ data: [
      { id: id.admin, role: Role.ADMIN }, { id: id.agent, role: Role.AGENT },
      { id: id.master, role: Role.CLIENT_MASTER, organizationId: id.org },
      { id: id.requester, role: Role.CLIENT, organizationId: id.org },
    ].map(user => ({ ...user, name: `Comercial ${user.role}`, email: `${user.id}@e2e.invalid`, password: 'unused-jwt-fixture' })) });
    for (const [userId, role] of [
      [id.agent, Role.AGENT], [id.master, Role.CLIENT_MASTER], [id.requester, Role.CLIENT],
    ] as const) {
      await linkFixtureUserToDefaultPermissionGroup(db, userId, role);
    }
    await db.serviceDesk.create({ data: { id: id.desk, name: `Comercial ${id.desk}`, agents: { connect: { id: id.agent } }, organizations: { connect: { id: id.org } } } });
    await db.ticket.create({ data: { id: id.ticket, protocol: `E2E-${id.ticket}`, title: 'Modalidades reais', description: 'Validação comercial local', requesterId: id.requester, commercialOrganizationId: id.org, serviceDeskId: id.desk } });

    for (const userId of [id.admin, id.agent]) {
      const initial = await request.post('/api/contracts/cost-rates', { headers, data: { userId, effectiveFrom: '2026-10-01T03:00:00Z', hourlyCostCents: 3000 } });
      expect(initial.status(), await initial.text()).toBe(201);
    }
    expect((await request.get('/api/contracts/cost-rates', { headers: agentHeaders })).status()).toBe(403);
    expect((await request.get('/api/reports/commercial', { headers: masterHeaders })).status()).toBe(403);

    // No mode, including manual and guarantee, bypasses commercial authority.
    for (const data of [{}, { valuationType: 'MANUAL', value: 10 }, { valuationType: 'GUARANTEE', bonusReason: 'Correção sem contrato' }]) {
      const denied = await postLog(data);
      expect(denied.status(), await denied.text()).toBe(400);
    }
    expect(await db.worklog.count({ where: { ticketId: id.ticket } })).toBe(0);

    const hourly = await createContract('HOURLY', { hourlyRateCents: 12000 });
    const monthly = await createContract('MONTHLY_HOURS', { monthlyFeeCents: 10000, includedMinutes: 30, excessHourlyRateCents: 12000 });
    const project = await createContract('FIXED_PROJECT', { fixedPriceCents: 50000, estimatedMinutes: 30, scope: 'API estimada e aprovada' });
    const hourlyLog = await postLog({ contractId: hourly });
    expect(hourlyLog.status(), await hourlyLog.text()).toBe(201);
    expect(await hourlyLog.json()).toMatchObject({ valueCents: 12000, costCents: 3000 });
    expect(await commercial(hourly, '2026-10')).toMatchObject({ effortMinutes: 60, incrementalRevenueCents: 12000, fixedRevenueCents: 0, knownCostCents: 3000, resultCents: 9000 });

    const projectLog = await postLog({ contractId: project });
    expect(projectLog.status(), await projectLog.text()).toBe(201);
    expect(await projectLog.json()).toMatchObject({ valueCents: 0, costCents: 3000 });
    expect(await commercial(project)).toMatchObject({ effortMinutes: 60, estimatedMinutes: 30, remainingEstimateMinutes: 0, fixedRevenueCents: 50000, resultCents: 47000, status: 'PROJECT_PARTIAL' });
    expect(await commercial(project, '2026-10')).toMatchObject({ fixedRevenueCents: null, resultCents: null, status: 'PROJECT_MONTH_REVENUE_UNALLOCATED' });

    // Fixed monthly revenue exists even before the first worklog.
    expect(await commercial(monthly, '2026-10')).toMatchObject({ fixedRevenueCents: 10000, effortMinutes: 0 });
    const monthlyLog = await postLog({ contractId: monthly });
    expect(monthlyLog.status(), await monthlyLog.text()).toBe(201);
    expect(await monthlyLog.json()).toMatchObject({ valueCents: 6000, costCents: 3000 });
    const bonus = await postLog({ contractId: monthly, valuationType: 'BONUS', bonusReason: 'Retrabalho autorizado pela gestão' });
    expect(bonus.status(), await bonus.text()).toBe(201);
    expect(await bonus.json()).toMatchObject({ valueCents: 0, costCents: 3000, billable: false });
    const agentBonus = await postLog({ contractId: monthly, valuationType: 'BONUS', bonusReason: 'Sem autorização' }, agentHeaders);
    expect(agentBonus.status(), await agentBonus.text()).toBe(403);
    const guarantee = await postLog({ contractId: monthly, valuationType: 'GUARANTEE', bonusReason: 'Correção de erro' }, agentHeaders);
    expect(guarantee.status(), await guarantee.text()).toBe(201);
    expect(await commercial(monthly, '2026-10')).toMatchObject({ effortMinutes: 180, bonusMinutes: 120, incrementalRevenueCents: 6000, fixedRevenueCents: 10000, knownCostCents: 9000, resultCents: 7000 });

    // Both individual cost and internal rework reasons remain private.
    for (const actorHeaders of [agentHeaders]) {
      const response = await request.get(`/api/tickets/${id.ticket}/worklogs`, { headers: actorHeaders });
      expect(response.status()).toBe(200);
      for (const row of await response.json()) {
        expect(row.costCents).toBeNull();
        expect(row.bonusReason).toBeNull();
        expect(row.valuationSnapshot).toBeNull();
      }
    }
    const newCost = await request.post('/api/contracts/cost-rates', { headers, data: { userId: id.admin, effectiveFrom: '2026-11-01T03:00:00Z', hourlyCostCents: 9000 } });
    expect(newCost.status(), await newCost.text()).toBe(201);
    const rejectedCost = await request.post('/api/contracts/cost-rates', { headers, data: { userId: id.admin, effectiveFrom: '2026-10-01T03:00:00Z', hourlyCostCents: 1 } });
    expect(rejectedCost.status(), await rejectedCost.text()).toBe(400);
    const amended = await request.post(`/api/contracts/${hourly}/update`, { headers, data: { hourlyRateCents: 24000, conditionsEffectiveAt: '2026-11-01T03:00:00Z' } });
    expect(amended.ok(), await amended.text()).toBeTruthy();
    expect(await commercial(hourly, '2026-10')).toMatchObject({ incrementalRevenueCents: 12000, knownCostCents: 3000, resultCents: 9000 });

    await db.organization.update({ where: { id: id.org }, data: { serviceDesks: { disconnect: { id: id.desk } } } });
    const unlinked = await postLog({ contractId: hourly });
    expect(unlinked.status(), await unlinked.text()).toBe(400);
    await db.organization.update({ where: { id: id.org }, data: { serviceDesks: { connect: { id: id.desk } } } });
    await db.ticket.update({ where: { id: id.ticket }, data: { commercialOrganizationId: null } });
    const missingCompany = await postLog({ contractId: hourly });
    expect(missingCompany.status(), await missingCompany.text()).toBe(400);
    await db.ticket.update({ where: { id: id.ticket }, data: { commercialOrganizationId: id.org } });
    await db.contract.update({ where: { id: hourly }, data: { serviceDesks: { disconnect: { id: id.desk } } } });
    const contractOutsideDesk = await postLog({ contractId: hourly });
    expect(contractOutsideDesk.status(), await contractOutsideDesk.text()).toBe(400);
    await db.contract.update({ where: { id: hourly }, data: { serviceDesks: { connect: { id: id.desk } } } });
    await db.contract.update({ where: { id: hourly }, data: { active: false } });
    expect((await postLog({ contractId: hourly })).status()).toBe(400);
    await db.contract.update({ where: { id: hourly }, data: { active: true, approved: false } });
    expect((await postLog({ contractId: hourly })).status()).toBe(400);
    await db.contract.update({ where: { id: hourly }, data: { approved: true } });
    const legacy = await db.contract.create({ data: { organizationId: id.org, name: 'Legado pendente', type: 'FIXED_COVERAGE', active: true, approved: false } });
    expect((await postLog({ contractId: legacy.id })).status()).toBe(400);

    // Stopping preserves raw time even if commercial eligibility changed.
    const timer = await request.post(`/api/tickets/${id.ticket}/pre-appointments`, { headers: agentHeaders, data: { contractId: hourly, beginning: new Date(Date.now() - 60000).toISOString() } });
    expect(timer.status(), await timer.text()).toBe(201);
    const timerId = (await timer.json()).id;
    await db.contract.update({ where: { id: hourly }, data: { active: false } });
    const blockedTimer = await request.post(`/api/tickets/${id.ticket}/pre-appointments`, { headers: agentHeaders, data: { contractId: hourly } });
    expect(blockedTimer.status(), await blockedTimer.text()).toBe(400);
    const stopped = await request.patch(`/api/tickets/${id.ticket}/pre-appointments/${timerId}`, { headers: agentHeaders, data: { ending: new Date().toISOString() } });
    expect(stopped.status(), await stopped.text()).toBe(200);
    const stoppedTimer = await stopped.json();
    expect(stoppedTimer.ending).toBeTruthy();
    const timerWork = { contractId: hourly, preAppointmentId: timerId, startTime: stoppedTimer.beginning, endTime: stoppedTimer.ending };
    const blockedConversion = await postLog(timerWork, agentHeaders);
    expect(blockedConversion.status(), await blockedConversion.text()).toBe(400);
    expect(await db.preAppointment.count({ where: { id: timerId } })).toBe(1);
    const reactivated = await request.post(`/api/contracts/${hourly}/update`, { headers, data: { active: true } });
    expect(reactivated.ok(), await reactivated.text()).toBeTruthy();
    const conversions = await Promise.all([postLog(timerWork, agentHeaders), postLog(timerWork, agentHeaders)]);
    expect(conversions.map(response => response.status()).sort()).toEqual([201, 400]);
    const converted = await conversions[conversions[0].status() === 201 ? 0 : 1].json();
    expect(converted.sourcePreAppointmentId).toBe(timerId);
    const audit = await request.get(`/api/tickets/${id.ticket}/worklog-audit`, { headers });
    expect(audit.status(), await audit.text()).toBe(200);
    expect((await audit.json()).find((row: { id: string }) => row.id === converted.id)).toMatchObject({
      valuationSnapshot: { sourcePreAppointmentId: timerId, sourceBeginning: stoppedTimer.beginning, sourceEnding: stoppedTimer.ending, sourceContractId: hourly, recordedById: id.agent, performedById: id.agent },
    });
    const voided = await request.delete(`/api/tickets/${id.ticket}/worklogs/${converted.id}`, { headers: agentHeaders });
    expect(voided.status(), await voided.text()).toBe(200);
    const reconversion = await postLog(timerWork, agentHeaders);
    expect(reconversion.status(), await reconversion.text()).toBe(400);
    const afterVoid = await request.get(`/api/tickets/${id.ticket}/worklog-audit`, { headers });
    const auditRow = (await afterVoid.json()).find((row: { id: string }) => row.id === converted.id);
    expect(auditRow).toMatchObject({ voidedBy: id.agent, valuationSnapshot: { sourcePreAppointmentId: timerId, recordedById: id.agent } });
    expect(auditRow.voidedAt).toBeTruthy();
    expect((await request.get(`/api/tickets/${id.ticket}/worklog-audit`, { headers: agentHeaders })).status()).toBe(403);
  } finally {
    await db.preAppointment.deleteMany({ where: { ticketId: id.ticket } });
    await db.worklog.deleteMany({ where: { ticketId: id.ticket } });
    await db.comment.deleteMany({ where: { ticketId: id.ticket } });
    await db.ticketAudit.deleteMany({ where: { ticketId: id.ticket } });
    await db.ticket.deleteMany({ where: { id: id.ticket } });
    await db.contractTerm.deleteMany({ where: { contract: { organizationId: id.org } } });
    await db.contractLifecycleEvent.deleteMany({ where: { contract: { organizationId: id.org } } });
    await db.contract.deleteMany({ where: { organizationId: id.org } });
    await db.technicianCostRate.deleteMany({ where: { userId: { in: [id.admin, id.agent] } } });
    await db.organizationDeskEvent.deleteMany({ where: { organizationId: id.org } });
    await db.serviceDesk.deleteMany({ where: { id: id.desk } });
    await db.user.deleteMany({ where: { id: { in: [id.admin, id.agent, id.master, id.requester] } } });
    await db.organization.deleteMany({ where: { id: id.org } });
    await db.$disconnect();
  }
});
