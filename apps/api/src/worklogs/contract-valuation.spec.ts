import { splitBillingCycles, valueContractMinutes } from './contract-valuation';

describe('contract valuation', () => {
  const contract = { type: 'HOURS_LIMIT', includedMinutes: 600, hoursLimit: null, excessHourlyRateCents: 12000 };
  it('charges only excess using the explicit hourly tariff', () => {
    expect(valueContractMinutes(contract, 60, 570)).toEqual({ coveredMinutes: 30, excessMinutes: 30, amountCents: 6000 });
  });
  it('includes exactly the remaining allowance and preserves zero tariff', () => {
    expect(valueContractMinutes(contract, 30, 570).amountCents).toBe(0);
    expect(valueContractMinutes({ ...contract, excessHourlyRateCents: 0 }, 60, 600).amountCents).toBe(0);
  });
  it('does not invent a monetary value when the excess tariff is missing', () => {
    expect(valueContractMinutes({ ...contract, excessHourlyRateCents: null }, 60, 600).amountCents).toBeNull();
  });
  it('supports existing hours limits without deriving an excess rate from monthly value', () => {
    expect(valueContractMinutes({ ...contract, includedMinutes: null, hoursLimit: 10 }, 60, 570).amountCents).toBe(6000);
    expect(valueContractMinutes({ ...contract, includedMinutes: null }, 60, 0)).toEqual({ coveredMinutes: 0, excessMinutes: 0, amountCents: null });
  });
  it('includes fixed coverage and rounds only the final amount to cents', () => {
    expect(valueContractMinutes({ ...contract, type: 'FIXED_COVERAGE' }, 60, 999).coveredMinutes).toBe(60);
    expect(valueContractMinutes({ ...contract, includedMinutes: 0, excessHourlyRateCents: 100 }, 1, 0).amountCents).toBe(2);
  });
  it('splits a month boundary at Brasilia midnight, retaining all minutes', () => {
    const parts = splitBillingCycles(new Date('2026-11-01T02:30:00Z'), new Date('2026-11-01T03:30:00Z'));
    expect(parts).toEqual([
      { cycleStart: '2026-10-01T03:00:00.000Z', cycleEnd: '2026-11-01T03:00:00.000Z', minutes: 30 },
      { cycleStart: '2026-11-01T03:00:00.000Z', cycleEnd: '2026-12-01T03:00:00.000Z', minutes: 30 },
    ]);
  });
  it('uses the actual timezone offset for historical daylight saving dates', () => {
    expect(splitBillingCycles(new Date('2018-12-01T01:30:00Z'), new Date('2018-12-01T02:30:00Z')).map(p => p.minutes)).toEqual([30, 30]);
  });
});
