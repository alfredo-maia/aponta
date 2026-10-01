import { addBusinessHours, isWithinBusinessHours } from './business-hours';
import type { BusinessHour, Holiday } from '@prisma/client';

type BH = Pick<BusinessHour, 'weekday' | 'startTime' | 'endTime'>;
type Hol = Pick<Holiday, 'date'>;

/** Mon-Fri 08:00-18:00, no lunch break (simplest case). */
const MON_FRI_8_18: BH[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startTime: '08:00',
  endTime: '18:00',
}));

describe('addBusinessHours', () => {
  it('returns start + hours unchanged when there is no configured expediente (24/7 fallback)', () => {
    const start = new Date('2026-01-05T10:00:00.000Z'); // Monday
    const result = addBusinessHours(start, 5, [], []);
    expect(result.toISOString()).toBe('2026-01-05T15:00:00.000Z');
  });

  it('adds hours within the same business day without crossing the window', () => {
    // Monday 2026-01-05 is a Monday. 09:00 + 3h = 12:00, still within 08-18.
    const start = new Date('2026-01-05T09:00:00.000Z');
    const result = addBusinessHours(start, 3, MON_FRI_8_18, []);
    expect(result.toISOString()).toBe('2026-01-05T12:00:00.000Z');
  });

  it('rolls over to the next business day when exceeding today\'s window', () => {
    // Monday 16:00 + 4h of business time -> 2h left today (16-18), then
    // 2h more starting Tuesday 08:00 -> Tuesday 10:00.
    const start = new Date('2026-01-05T16:00:00.000Z');
    const result = addBusinessHours(start, 4, MON_FRI_8_18, []);
    expect(result.toISOString()).toBe('2026-01-06T10:00:00.000Z');
  });

  it('skips weekends entirely', () => {
    // Friday 2026-01-09 17:00 + 2h business -> 1h left Friday (17-18),
    // then 1h more -> Monday 2026-01-12 09:00 (skips Sat/Sun).
    const start = new Date('2026-01-09T17:00:00.000Z');
    const result = addBusinessHours(start, 2, MON_FRI_8_18, []);
    expect(result.toISOString()).toBe('2026-01-12T09:00:00.000Z');
  });

  it('skips configured holidays', () => {
    // Monday 2026-01-05 17:00 + 2h: 1h left Monday, Tuesday 01-06 is a
    // holiday, so the remaining 1h lands on Wednesday 01-07 09:00.
    const start = new Date('2026-01-05T17:00:00.000Z');
    const holidays: Hol[] = [{ date: new Date('2026-01-06T00:00:00.000Z') }];
    const result = addBusinessHours(start, 2, MON_FRI_8_18, holidays);
    expect(result.toISOString()).toBe('2026-01-07T09:00:00.000Z');
  });

  it('clamps a start time that falls before the business window to the window start', () => {
    // Monday 06:00 (before 08:00 opening) + 1h -> 09:00 same day.
    const start = new Date('2026-01-05T06:00:00.000Z');
    const result = addBusinessHours(start, 1, MON_FRI_8_18, []);
    expect(result.toISOString()).toBe('2026-01-05T09:00:00.000Z');
  });

  it('rolls a start time that falls after closing to the next business day opening', () => {
    // Monday 20:00 (after 18:00 close) + 1h -> Tuesday 09:00.
    const start = new Date('2026-01-05T20:00:00.000Z');
    const result = addBusinessHours(start, 1, MON_FRI_8_18, []);
    expect(result.toISOString()).toBe('2026-01-06T09:00:00.000Z');
  });

  it('handles a split-shift (two windows the same weekday)', () => {
    const splitShift: BH[] = [
      { weekday: 1, startTime: '08:00', endTime: '12:00' },
      { weekday: 1, startTime: '13:00', endTime: '18:00' },
    ];
    // Monday 11:00 + 3h: 1h left in morning window (11-12), then 2h in
    // afternoon window starting 13:00 -> 15:00.
    const start = new Date('2026-01-05T11:00:00.000Z');
    const result = addBusinessHours(start, 3, splitShift, []);
    expect(result.toISOString()).toBe('2026-01-05T15:00:00.000Z');
  });
});

describe('isWithinBusinessHours', () => {
  it('returns true when there is no configured expediente (24/7 fallback)', () => {
    expect(isWithinBusinessHours(new Date('2026-01-05T23:00:00.000Z'), [], [])).toBe(true);
  });

  it('returns true for a timestamp inside the configured window', () => {
    expect(
      isWithinBusinessHours(new Date('2026-01-05T10:00:00.000Z'), MON_FRI_8_18, []),
    ).toBe(true);
  });

  it('returns false for a timestamp outside the configured window', () => {
    expect(
      isWithinBusinessHours(new Date('2026-01-05T20:00:00.000Z'), MON_FRI_8_18, []),
    ).toBe(false);
  });

  it('returns false on a holiday even if within the normal weekday window', () => {
    const holidays: Hol[] = [{ date: new Date('2026-01-05T00:00:00.000Z') }];
    expect(
      isWithinBusinessHours(new Date('2026-01-05T10:00:00.000Z'), MON_FRI_8_18, holidays),
    ).toBe(false);
  });
});
