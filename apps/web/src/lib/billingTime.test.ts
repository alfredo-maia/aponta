import { describe, expect, it } from 'vitest';
import { billingMonthStartIso, brasiliaDayStartIso, brasiliaWallClockIso } from './billingTime';

describe('contract civil dates', () => {
  it('honors historical Sao Paulo daylight saving for billing cycles', () => {
    expect(billingMonthStartIso('2018-02')).toBe('2018-02-01T02:00:00.000Z');
    expect(billingMonthStartIso('2018-07')).toBe('2018-07-01T03:00:00.000Z');
    expect(billingMonthStartIso('2026-10')).toBe('2026-10-01T03:00:00.000Z');
  });
  it('uses the same timezone for contract validity dates', () => {
    expect(brasiliaDayStartIso('2018-02-15')).toBe('2018-02-15T02:00:00.000Z');
    expect(() => brasiliaDayStartIso('invalid')).toThrow('Data inválida');
  });
  it('converts the actual worklog wall clock independently of browser timezone', () => {
    expect(brasiliaWallClockIso('2026-10-15', '09:00')).toBe('2026-10-15T12:00:00.000Z');
    expect(brasiliaWallClockIso('2018-02-15', '09:00')).toBe('2018-02-15T11:00:00.000Z');
    expect(brasiliaWallClockIso('2026-10-15', '23:30')).toBe('2026-10-16T02:30:00.000Z');
  });
});
