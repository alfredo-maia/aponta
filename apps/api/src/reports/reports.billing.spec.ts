import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('Billing valuation snapshots', () => {
  const admin = { id: 'admin', role: Role.ADMIN };
  const organization = { id: 'org', name: 'Cliente' };
  const row = (fields: Record<string, unknown>) => ({
    minutes: 60, billable: true, startTime: new Date('2026-10-15T12:00:00Z'),
    ticket: { requester: { organization } }, ...fields,
  });
  const october = { cycleStart: '2026-10-01T03:00:00Z', cycleEnd: '2026-11-01T03:00:00Z', minutes: 60, coveredMinutes: 30, excessMinutes: 30, rateCents: 12000, amountCents: 6000 };
  let findMany: jest.Mock;
  let service: ReportsService;
  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    service = new ReportsService({ worklog: { findMany } } as any);
  });
  it('reconciles known zero, unknown legacy and excess snapshots without repricing', async () => {
    findMany.mockResolvedValue([
      row({ valueCents: 6000, valuationSnapshot: { segments: [october] } }),
      row({ valueCents: 0, billable: false }),
      row({ value: 99, valueCents: null }),
      row({ value: null, valueCents: null, minutes: 0 }),
    ]);
    expect(await service.getBilling(admin)).toEqual([expect.objectContaining({
      billableMinutes: 120, nonBillableMinutes: 60, coveredMinutes: 30,
      excessMinutes: 30, totalValueCents: 15900, unknownValuationCount: 1,
    })]);
  });
  it('filters contract and cycles, including only the selected monthly snapshot', async () => {
    findMany.mockResolvedValue([row({ valueCents: 12000, valuationSnapshot: { segments: [
      october, { ...october, cycleStart: '2026-11-01T03:00:00Z', cycleEnd: '2026-12-01T03:00:00Z' },
    ] } })]);
    const result = await service.getBilling(admin, { contractId: 'contract', startDate: '2026-10-01T03:00:00Z', endDate: '2026-11-01T03:00:00Z' });
    expect(result[0]).toMatchObject({ billableMinutes: 60, totalValueCents: 6000, coveredMinutes: 30, excessMinutes: 30 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ticket: {}, contractId: 'contract', voidedAt: null } }));
  });
  it('rejects malformed or inverted periods', async () => {
    await expect(service.getBilling(admin, { startDate: 'garbage' })).rejects.toThrow(BadRequestException);
    await expect(service.getBilling(admin, { startDate: '2026-11-01', endDate: '2026-10-01' })).rejects.toThrow(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
  it('fails closed for client and organization-less client master', async () => {
    await expect(service.getBilling({ id: 'client', role: Role.CLIENT })).rejects.toThrow(ForbiddenException);
    await expect(service.getBilling({ id: 'master', role: Role.CLIENT_MASTER })).rejects.toThrow(ForbiddenException);
  });
  it('keeps organization policy on contract-filtered queries', async () => {
    await service.getBilling({ id: 'master', role: Role.CLIENT_MASTER, organizationId: 'org' }, { contractId: 'other-contract' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ticket: { requester: { organizationId: 'org' } }, contractId: 'other-contract', voidedAt: null } }));
  });
  it('groups historical ownership and blocks financial leakage after requester moves', async () => {
    findMany.mockResolvedValue([row({ valueCents: 6000, valuationSnapshot: { organizationId: 'old-org', organizationName: 'Original', segments: [october] } })]);
    expect(await service.getBilling(admin)).toEqual([expect.objectContaining({ organizationId: 'old-org', organizationName: 'Original' })]);
    expect(await service.getBilling({ id: 'master', role: Role.CLIENT_MASTER, organizationId: 'org' })).toEqual([]);
  });
  it('retains historically unassigned organization instead of adopting a requester move', async () => {
    findMany.mockResolvedValue([row({ valueCents: 0, valuationSnapshot: { organizationId: null, organizationName: null, segments: [] } })]);
    expect(await service.getBilling(admin)).toEqual([expect.objectContaining({ organizationId: 'SEM_EMPRESA', totalValueCents: 0, unknownValuationCount: 0 })]);
    expect(await service.getBilling({ id: 'master', role: Role.CLIENT_MASTER, organizationId: 'org' })).toEqual([]);
  });
});
