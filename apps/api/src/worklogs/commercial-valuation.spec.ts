import { allocateCommercialSegments } from './commercial-valuation';

describe('commercial valuation v2', () => {
  const start = new Date('2026-10-17T12:00:00Z');
  const end = new Date('2026-10-17T14:00:00Z');
  const base = { id: 't1', effectiveFrom: new Date('2026-10-01T03:00:00Z'), type: 'HOURLY', hourlyRateCents: 12000,
    includedMinutes: null, excessHourlyRateCents: null, monthlyFeeCents: null, fixedPriceCents: null, estimatedMinutes: null };
  const costs = [{ id: 'cost1', effectiveFrom: new Date('2026-01-01T00:00:00Z'), hourlyCostCents: 6000 }];
  it('values every hourly minute and preserves unknown costs', () => {
    const result = allocateCommercialSegments({ start, end, terms: [base], costRates: [], previous: [], billable: true, valuationType: 'CONTRACT' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ minutes: 120, amountCents: 24000, costCents: null, rateCents: 12000, termId: 't1' });
  });
  it('segments both tariff and cost changes inside a month', () => {
    const terms = [base, { ...base, id: 't2', effectiveFrom: new Date('2026-10-17T13:00:00Z'), hourlyRateCents: 18000 }];
    const costRates = [...costs, { id: 'cost2', effectiveFrom: new Date('2026-10-17T13:30:00Z'), hourlyCostCents: 9000 }];
    const result = allocateCommercialSegments({ start, end, terms, costRates, previous: [], billable: true, valuationType: 'CONTRACT' });
    expect(result.map(x => x.minutes)).toEqual([60, 30, 30]);
    expect(result.map(x => x.amountCents)).toEqual([12000, 9000, 9000]);
    expect(result.map(x => x.costCents)).toEqual([6000, 3000, 4500]);
  });
  it('uses the monthly allowance once even when conditions change mid-log', () => {
    const monthly = { ...base, type: 'MONTHLY_HOURS', includedMinutes: 60, excessHourlyRateCents: 12000, monthlyFeeCents: 50000 };
    const result = allocateCommercialSegments({ start, end, terms: [monthly, { ...monthly, id: 't2', effectiveFrom: new Date('2026-10-17T13:00:00Z') }], costRates: costs, previous: [], billable: true, valuationType: 'CONTRACT' });
    expect(result.map(x => x.coveredMinutes)).toEqual([60, 0]);
    expect(result.map(x => x.amountCents)).toEqual([0, 12000]);
  });
  it('retains previous registration consumption and renews only at the Brasília month boundary', () => {
    const monthly = { ...base, type: 'MONTHLY_HOURS', includedMinutes: 60, excessHourlyRateCents: 12000, monthlyFeeCents: 50000 };
    const result = allocateCommercialSegments({ start: new Date('2026-11-01T02:30:00Z'), end: new Date('2026-11-01T03:30:00Z'), terms: [monthly], costRates: costs,
      previous: [{ cycleStart: '2026-10-01T03:00:00.000Z', minutes: 60 }], billable: true, valuationType: 'CONTRACT' });
    expect(result.map(x => x.amountCents)).toEqual([6000, 0]);
    expect(result.map(x => x.coveredMinutes)).toEqual([0, 30]);
  });
  it('does not charge automatically when a fixed project exceeds its estimate', () => {
    const result = allocateCommercialSegments({ start, end, terms: [{ ...base, type: 'FIXED_PROJECT', scope: 'API aprovada', estimatedMinutes: 30, fixedPriceCents: 50000 }], costRates: costs, previous: [], billable: true, valuationType: 'CONTRACT' });
    expect(result[0]).toMatchObject({ minutes: 120, amountCents: 0, costCents: 12000 });
  });
  it.each(['BONUS', 'GUARANTEE'])('retains cost without allowance consumption or revenue for %s', valuationType => {
    const result = allocateCommercialSegments({ start, end, terms: [base], costRates: costs, previous: [], billable: false, valuationType });
    expect(result[0]).toMatchObject({ amountCents: 0, costCents: 12000, coveredMinutes: 0, excessMinutes: 0 });
  });
  it('conserves manual cents across a cost boundary', () => {
    const result = allocateCommercialSegments({ start, end, terms: [base], costRates: [...costs, { ...costs[0], id: 'c2', effectiveFrom: new Date('2026-10-17T13:00:00Z') }], previous: [], billable: true, valuationType: 'MANUAL', manualCents: 101 });
    expect(result.reduce((n, x) => n + x.amountCents, 0)).toBe(101);
    expect(result.reduce((n, x) => n + x.coveredMinutes, 0)).toBe(0);
  });
  it('rejects missing terms and missing mandatory sale rates', () => {
    expect(() => allocateCommercialSegments({ start, end, terms: [], costRates: [], previous: [], billable: true, valuationType: 'CONTRACT' })).toThrow();
    expect(() => allocateCommercialSegments({ start, end, terms: [{ ...base, hourlyRateCents: null }], costRates: [], previous: [], billable: true, valuationType: 'CONTRACT' })).toThrow();
  });
  it.each(['HOURLY', 'MONTHLY_HOURS'])('conserves low-cent %s revenue and cost across an unrelated boundary', type => {
    const term = { ...base, type, hourlyRateCents: 1, includedMinutes: 0, monthlyFeeCents: 0, excessHourlyRateCents: 1 };
    const result = allocateCommercialSegments({ start, end: new Date('2026-10-17T13:00:00Z'), terms: [term], costRates: [
      { ...costs[0], hourlyCostCents: 1 }, { ...costs[0], id: 'c2', hourlyCostCents: 1, effectiveFrom: new Date('2026-10-17T12:30:00Z') },
    ], previous: [], billable: true, valuationType: 'CONTRACT' });
    expect(result.reduce((sum, part) => sum + part.amountCents, 0)).toBe(1);
    expect(result.reduce((sum, part) => sum + (part.costCents ?? 0), 0)).toBe(1);
  });
});
