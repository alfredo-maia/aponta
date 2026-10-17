import { Role } from '@prisma/client';
import { CommercialReportsService } from './commercial-reports.service';

describe('CommercialReportsService', () => {
  const admin = { id: 'admin', role: Role.ADMIN };
  let db: any;
  let service: CommercialReportsService;
  const contract = (extra: Record<string, unknown> = {}) => ({ id: 'c', name: 'Contrato', organizationId: 'o', organization: { name: 'Empresa' }, type: 'MONTHLY_HOURS', active: true, approved: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null, monthlyFeeCents: 10000, terms: [], lifecycleEvents: [{ effectiveFrom: new Date('2026-01-01T03:00:00Z'), active: extra.active ?? true, approved: extra.approved ?? true, startsAt: extra.startsAt ?? new Date('2026-01-01T03:00:00Z'), endsAt: extra.endsAt ?? null }], ...extra });
  const term = (extra = {}) => ({ approved: true, active: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null, ...extra });
  beforeEach(() => {
    db = { contract: { findMany: jest.fn().mockResolvedValue([]) }, worklog: { findMany: jest.fn().mockResolvedValue([]) } };
    service = new CommercialReportsService(db);
  });
  it('rejects every non administrator, including master agents and clients', async () => {
    for (const role of [Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER, Role.CLIENT]) {
      await expect(service.getCommercial({ id: 'u', role }, {})).rejects.toThrow();
    }
    expect(db.contract.findMany).not.toHaveBeenCalled();
  });
  it('validates month before loading data', async () => {
    for (const month of ['2026-13', 'foo', '2026-1']) await expect(service.getCommercial(admin, { month })).rejects.toThrow();
  });
  it('includes monthly revenue once even when there are no worklogs', async () => {
    db.contract.findMany.mockResolvedValue([contract()]);
    expect(await service.getCommercial(admin, { month: '2026-09' })).toEqual([expect.objectContaining({ fixedRevenueCents: 10000, totalRevenueCents: 10000, effortMinutes: 0, resultCents: 10000 })]);
  });
  it('selects immutable cycle amounts and costs, including bonus effort', async () => {
    db.contract.findMany.mockResolvedValue([contract()]);
    db.worklog.findMany.mockResolvedValue([{ contractId: 'c', billable: false, valuationType: 'GUARANTEE', valuationSnapshot: { organizationId: 'o', segments: [
      { cycleStart: '2026-09-01T03:00:00.000Z', minutes: 60, amountCents: 0, costCents: 3000 },
      { cycleStart: '2026-10-01T03:00:00.000Z', minutes: 20, amountCents: 0, costCents: 1000 },
    ] } }]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ effortMinutes: 60, bonusMinutes: 60, knownCostCents: 3000, resultCents: 7000 });
  });
  it('does not invent cost or net result when historical costs are unknown', async () => {
    db.contract.findMany.mockResolvedValue([contract()]);
    db.worklog.findMany.mockResolvedValue([{ contractId: 'c', minutes: 60, startTime: new Date('2026-09-03T12:00:00Z'), valueCents: 0, valuationSnapshot: null }]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ unknownCostMinutes: 60, hasIncompleteCosts: true, resultCents: null });
  });
  it('marks partial monthly coverage and intramonth amendments as unknown fixed revenue', async () => {
    db.contract.findMany.mockResolvedValue([contract({ startsAt: new Date('2026-09-02T03:00:00Z') })]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ fixedRevenueCents: null, totalRevenueCents: null, resultCents: null, status: 'PARTIAL_MONTH_REVENUE_PENDING' });
    db.contract.findMany.mockResolvedValue([contract({ terms: [term({ effectiveFrom: new Date('2026-01-01T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 10000 }), term({ effectiveFrom: new Date('2026-09-15T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 20000 })] })]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0].fixedRevenueCents).toBeNull();
  });
  it('uses the commercial term effective in the selected historical period', async () => {
    db.contract.findMany.mockResolvedValue([contract({ monthlyFeeCents: 20000, terms: [term({ effectiveFrom: new Date('2026-01-01T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 10000 }), term({ effectiveFrom: new Date('2026-10-01T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 20000 })] })]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0].fixedRevenueCents).toBe(10000);
  });
  it('counts project price once in cumulative view and labels it partial; never prorates to month', async () => {
    db.contract.findMany.mockResolvedValue([contract({ type: 'FIXED_PROJECT', fixedPriceCents: 50000, estimatedMinutes: 120 })]);
    const all = (await service.getCommercial(admin, {}))[0];
    expect(all).toMatchObject({ fixedRevenueCents: 50000, estimatedMinutes: 120, remainingEstimateMinutes: 120, status: 'PROJECT_PARTIAL' });
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ fixedRevenueCents: null, status: 'PROJECT_MONTH_REVENUE_UNALLOCATED', resultCents: null });
  });
  it('never invents recurring revenue for unapproved or legacy contracts', async () => {
    db.contract.findMany.mockResolvedValue([contract({ approved: false }), contract({ id: 'legacy', type: 'FIXED_COVERAGE' })]);
    expect((await service.getCommercial(admin, { month: '2026-09' })).every(row => row.fixedRevenueCents === null)).toBe(true);
  });
  it('ignores records whose immutable organization differs from the contract', async () => {
    db.contract.findMany.mockResolvedValue([contract()]);
    db.worklog.findMany.mockResolvedValue([{ contractId: 'c', valuationSnapshot: { organizationId: 'other', segments: [{ cycleStart: '2026-09-01T03:00:00Z', minutes: 90, amountCents: 90000, costCents: 100 }] } }]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0].effortMinutes).toBe(0);
  });
  it('sums hourly immutable revenue without multiplying the current tariff', async () => {
    db.contract.findMany.mockResolvedValue([contract({ type: 'HOURLY', hourlyRateCents: 99999 })]);
    db.worklog.findMany.mockResolvedValue([{ contractId: 'c', minutes: 60, startTime: new Date('2026-09-03T12:00:00Z'), valueCents: 5000, costCents: 1000, valuationSnapshot: null }]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ fixedRevenueCents: 0, incrementalRevenueCents: 5000, resultCents: 4000 });
  });
  it('preserves historical monthly revenue when the current contract is suspended or unapproved', async () => {
    db.contract.findMany.mockResolvedValue([contract({ active: false, approved: false, startsAt: new Date('2026-10-01T03:00:00Z'), lifecycleEvents: [
      { effectiveFrom: new Date('2026-01-01T03:00:00Z'), active: true, approved: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
      { effectiveFrom: new Date('2026-10-01T03:00:00Z'), active: false, approved: false, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
    ], terms: [
      term({ effectiveFrom: new Date('2026-01-01T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 10000 }),
      term({ effectiveFrom: new Date('2026-10-01T03:00:00Z'), type: 'MONTHLY_HOURS', monthlyFeeCents: 20000, active: false, approved: false }),
    ] })]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0].fixedRevenueCents).toBe(10000);
    expect((await service.getCommercial(admin, { month: '2026-10' }))[0].fixedRevenueCents).toBeNull();
    expect(db.worklog.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ voidedAt: null }) }));
  });
  it('retains an approved project price after suspension, without claiming final profit', async () => {
    db.contract.findMany.mockResolvedValue([contract({ type: 'FIXED_PROJECT', active: false, approved: false, lifecycleEvents: [
      { effectiveFrom: new Date('2026-01-01T03:00:00Z'), active: true, approved: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
      { effectiveFrom: new Date('2026-10-01T03:00:00Z'), active: false, approved: false, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
    ], terms: [term({ type: 'FIXED_PROJECT', effectiveFrom: new Date('2026-01-01T03:00:00Z'), fixedPriceCents: 50000, estimatedMinutes: 60 }), term({ type: 'FIXED_PROJECT', effectiveFrom: new Date('2026-10-01T03:00:00Z'), fixedPriceCents: 90000, estimatedMinutes: 60, active: false, approved: false })] })]);
    expect((await service.getCommercial(admin, {}))[0]).toMatchObject({ fixedRevenueCents: 50000, status: 'PROJECT_PARTIAL' });
  });
  it('marks intramonth suspension unknown even with unchanged financial terms', async () => {
    db.contract.findMany.mockResolvedValue([contract({ active: false, lifecycleEvents: [
      { effectiveFrom: new Date('2026-01-01T03:00:00Z'), active: true, approved: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
      { effectiveFrom: new Date('2026-09-15T03:00:00Z'), active: false, approved: true, startsAt: new Date('2026-01-01T03:00:00Z'), endsAt: null },
    ] })]);
    expect((await service.getCommercial(admin, { month: '2026-09' }))[0]).toMatchObject({ fixedRevenueCents: null, status: 'PARTIAL_MONTH_REVENUE_PENDING' });
  });
  it('defaults recurring reports to the current São Paulo competence, not UTC month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T01:00:00Z'));
    try {
      db.contract.findMany.mockResolvedValue([contract()]);
      expect((await service.getCommercial(admin, {}))[0].period).toBe('2026-09');
    } finally { jest.useRealTimers(); }
  });
  it('bounds broad queries rather than silently truncating totals', async () => {
    db.contract.findMany.mockResolvedValue(Array.from({ length: 501 }, () => contract()));
    await expect(service.getCommercial(admin, {})).rejects.toThrow('Selecione um contrato');
    db.contract.findMany.mockResolvedValue([contract()]);
    db.worklog.findMany.mockResolvedValue(Array.from({ length: 50001 }, () => ({})));
    await expect(service.getCommercial(admin, {})).rejects.toThrow('Limite de registros');
  });
});
