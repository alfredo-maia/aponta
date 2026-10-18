import { WorklogsService } from './worklogs.service';
import { Role, ValuationType } from '@prisma/client';

describe('mandatory commercial authorization', () => {
  const admin = { id: 'tech', role: Role.ADMIN };
  const agent = { id: 'tech', role: Role.AGENT };
  const dto = { startTime: '2026-10-17T12:00:00Z', endTime: '2026-10-17T13:00:00Z', description: 'Trabalho', contractId: 'contract' };
  const term = { id: 'term', approved: true, active: true, effectiveFrom: new Date('2026-10-01T00:00:00Z'), type: 'HOURLY', serviceDeskIds: ['desk'], hourlyRateCents: 15000,
    includedMinutes: null, excessHourlyRateCents: null, monthlyFeeCents: null, fixedPriceCents: null, estimatedMinutes: null };
  let db: any;
  let service: WorklogsService;
  beforeEach(() => {
    const contract = { id: 'contract', organizationId: 'org', approved: true, active: true, type: 'HOURLY', name: 'Avulso',
      startsAt: new Date('2026-01-01'), endsAt: null, serviceDesks: [{ id: 'desk' }], terms: [term],
      lifecycleEvents: [{ approved: true, active: true, startsAt: new Date('2026-01-01'), endsAt: null, effectiveFrom: new Date('2026-01-01') }] };
    const ticket = { id: 'ticket', serviceDeskId: 'desk', commercialOrganizationId: 'org', commercialOrganization: { id: 'org', name: 'Cliente' },
      requester: { organizationId: 'org', organization: { id: 'org', name: 'Cliente' } }, serviceDesk: { listedGroupsOnly: false, agents: [], agentGroups: [] } };
    db = { $queryRaw: jest.fn().mockResolvedValue([]), $transaction: jest.fn((fn: any) => fn(db)),
      ticket: { findUnique: jest.fn().mockResolvedValue(ticket), update: jest.fn() }, serviceDesk: { findFirst: jest.fn().mockResolvedValue({ id: 'desk' }) },
      contract: { findMany: jest.fn().mockResolvedValue([contract]), findUniqueOrThrow: jest.fn().mockResolvedValue(contract) },
      technicianCostRate: { findMany: jest.fn().mockResolvedValue([{ id: 'cost', effectiveFrom: new Date('2026-01-01'), hourlyCostCents: 10000 }]) },
      worklog: { create: jest.fn(({ data }) => Promise.resolve({ id: 'log', ...data })), update: jest.fn(), delete: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      preAppointment: { create: jest.fn(({ data }) => Promise.resolve({ id: 'timer', ...data })), findUnique: jest.fn(), update: jest.fn() } };
    service = new WorklogsService(db, {} as any, {} as any);
  });
  it('blocks a company without an explicit desk relationship', async () => {
    db.serviceDesk.findFirst.mockResolvedValue(null);
    await expect(service.create('ticket', dto, admin)).rejects.toThrow(/mesa/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it.each([ValuationType.CONTRACT, ValuationType.MANUAL, ValuationType.GUARANTEE, ValuationType.BONUS])('requires a contract even for %s', async valuationType => {
    db.contract.findMany.mockResolvedValue([]);
    await expect(service.create('ticket', { ...dto, contractId: undefined, valuationType, value: 10, bonusReason: 'Retrabalho' }, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('does not authorize a contract after it was suspended while acquiring its lock', async () => {
    db.contract.findUniqueOrThrow.mockResolvedValue({ ...(await db.contract.findMany())[0], active: false });
    await expect(service.create('ticket', dto, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('records hourly revenue and actual cost snapshots', async () => {
    const result = await service.create('ticket', dto, admin);
    expect(result).toMatchObject({ contractId: 'contract', valueCents: 15000, costCents: 10000 });
    expect(result.valuationSnapshot).toMatchObject({ version: 2, organizationId: 'org', serviceDeskId: 'desk', segments: [expect.objectContaining({ termId: 'term', costRateId: 'cost' })] });
  });
  it('keeps cost for an authorized bonus and excludes its revenue', async () => {
    const result = await service.create('ticket', { ...dto, valuationType: ValuationType.BONUS, bonusReason: 'Erro de desenvolvimento' }, admin);
    expect(result).toMatchObject({ billable: false, valueCents: 0, costCents: 10000, contractId: 'contract' });
  });
  it('forbids bonus authorization by a technician and a reasonless guarantee', async () => {
    await expect(service.create('ticket', { ...dto, valuationType: ValuationType.BONUS, bonusReason: 'Erro' }, agent)).rejects.toThrow(/admin/i);
    await expect(service.create('ticket', { ...dto, valuationType: ValuationType.GUARANTEE }, agent)).rejects.toThrow(/motivo/i);
  });
  it('prevents billable=false from becoming an unapproved bonus bypass', async () => {
    await expect(service.create('ticket', { ...dto, billable: false }, agent)).rejects.toThrow();
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('masks cost and financial memory for technicians', async () => {
    const result = await service.create('ticket', dto, agent);
    expect(result).toMatchObject({ valueCents: null, costCents: null, valuationSnapshot: null });
    expect(JSON.stringify(result)).not.toContain('hourlyCostCents');
  });
  it('blocks timer start without commercial authorization', async () => {
    db.contract.findMany.mockResolvedValue([]);
    await expect(service.createPreAppointment('ticket', { beginning: dto.startTime }, admin)).rejects.toThrow(/contrato/i);
    expect(db.preAppointment.create).not.toHaveBeenCalled();
  });
  it('retains a timer contract and allows stopping after contract suspension', async () => {
    const pre = await service.createPreAppointment('ticket', { beginning: dto.startTime, contractId: 'contract' }, admin);
    expect(pre.contractId).toBe('contract');
    db.contract.findMany.mockResolvedValue([]);
    db.preAppointment.findUnique.mockResolvedValue({ ...pre, ticketId: 'ticket', authorId: admin.id });
    db.preAppointment.update.mockResolvedValue({ ...pre, ending: new Date(dto.endTime) });
    await expect(service.stopPreAppointment('ticket', pre.id, { ending: dto.endTime }, admin)).resolves.toBeDefined();
  });
  it('records the raw timer source and prevents a second conversion', async () => {
    db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: admin.id, contractId: 'contract', beginning: new Date('2026-10-17T12:00:35Z'), ending: new Date('2026-10-17T13:00:41Z') });
    const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin);
    expect(result.sourcePreAppointmentId).toBe('timer');
    expect(result.valuationSnapshot).toMatchObject({ sourceBeginning: '2026-10-17T12:00:35.000Z', sourceEnding: '2026-10-17T13:00:41.000Z', sourceContractChanged: false });
    db.worklog.findUnique.mockResolvedValue(result);
    await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin)).rejects.toThrow(/convertido/i);
  });
  it('regularizes a ticket only before its first worklog and only for an admin', async () => {
    await expect(service.setCommercialOrganization('ticket', 'new-org', agent)).rejects.toThrow();
    db.ticket.update.mockResolvedValue({ commercialOrganizationId: 'new-org' });
    await expect(service.setCommercialOrganization('ticket', 'new-org', admin)).resolves.toMatchObject({ commercialOrganizationId: 'new-org' });
    db.worklog.count.mockResolvedValue(1);
    await expect(service.setCommercialOrganization('ticket', 'other-org', admin)).rejects.toThrow(/apontamentos/i);
  });
  it.each([ValuationType.CONTRACT, ValuationType.MANUAL, ValuationType.GUARANTEE, ValuationType.BONUS])('does not accept incomplete historical draft conditions for %s', async valuationType => {
    const draft = { ...(await db.contract.findMany())[0], terms: [{ ...term, hourlyRateCents: null }] };
    db.contract.findMany.mockResolvedValue([draft]);
    await expect(service.create('ticket', { ...dto, valuationType, value: 10, bonusReason: 'Motivo' }, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('records the authorizing administrator separately from the performed-by technician', async () => {
    db.user = { findUnique: jest.fn().mockResolvedValue({ id: 'other-tech', role: Role.AGENT }) };
    const result = await service.create('ticket', { ...dto, authorId: 'other-tech', valuationType: ValuationType.BONUS, bonusReason: 'Correção autorizada' }, admin);
    expect(result.valuationSnapshot).toMatchObject({ authorizedById: admin.id, performedById: 'other-tech', authorizedAt: expect.any(String) });
  });
  it('voids a converted worklog without erasing its snapshot or permitting reconversion; repeat void retains actor/time', async () => {
    db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: admin.id, contractId: 'contract', beginning: new Date(dto.startTime), ending: new Date(dto.endTime) });
    const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin);
    db.worklog.findUnique.mockResolvedValue(result);
    db.worklog.update.mockImplementation(({ data }: any) => Object.assign(result, data));
    const voided = await service.delete('ticket', result.id, admin);
    const originalTime = voided.voidedAt;
    expect(voided.valuationSnapshot).toEqual(result.valuationSnapshot);
    expect(voided.voidedBy).toBe(admin.id);
    await service.delete('ticket', result.id, { id: 'another-admin', role: Role.ADMIN });
    expect(db.worklog.update).toHaveBeenCalledTimes(1);
    expect(voided.voidedAt).toBe(originalTime);
    expect(db.worklog.delete).not.toHaveBeenCalled();
    await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin)).rejects.toThrow(/convertido/i);
  });
});
