import { describe, expect, it } from 'vitest';
import {
  addMinutesToTime,
  brasiliaDatePtBr,
  brasiliaDateString,
  brasiliaTimeString,
  prefillFromTimer,
  storedIsoToWallClock,
  wallClockToStoredIso,
} from './brasiliaTime';

describe('brasiliaTime', () => {
  it('formats a UTC instant as Brasília date and time', () => {
    const utcEvening = new Date('2026-10-14T22:15:00.000Z');
    expect(brasiliaDateString(utcEvening)).toBe('2026-10-14');
    expect(brasiliaDatePtBr(utcEvening)).toBe('14/10/2026');
    expect(brasiliaTimeString(utcEvening)).toBe('19:15');
  });

  it('keeps the Brasília calendar day when UTC already rolled over', () => {
    const afterMidnightUtc = new Date('2026-10-15T01:10:00.000Z');
    expect(brasiliaDateString(afterMidnightUtc)).toBe('2026-10-14');
    expect(brasiliaTimeString(afterMidnightUtc)).toBe('22:10');
  });

  it('stores and reads wall-clock times without shifting hours', () => {
    expect(wallClockToStoredIso('2026-10-14', '19:15')).toBe('2026-10-14T19:15:00Z');
    expect(storedIsoToWallClock('2026-10-14T19:15:00.000Z')).toBe('19:15');
    expect(storedIsoToWallClock('2026-10-14T08:00:00Z')).toBe('08:00');
  });

  it('adds minutes wrapping around midnight', () => {
    expect(addMinutesToTime('08:00', 30)).toBe('08:30');
    expect(addMinutesToTime('23:50', 20)).toBe('00:10');
  });

  it('builds a TiFlux-like pre-apontamento from the timer range in Brasília', () => {
    const prefill = prefillFromTimer(
      new Date('2026-10-14T22:15:00.000Z'),
      new Date('2026-10-14T22:45:00.000Z'),
      30 * 60,
    );
    expect(prefill).toEqual({
      day: '2026-10-14',
      startTime: '19:15',
      endTime: '19:45',
    });
  });

  it('bumps the end time by at least one minute when start and end fall in the same minute', () => {
    const instant = new Date('2026-10-14T22:15:10.000Z');
    expect(prefillFromTimer(instant, instant, 20)).toEqual({
      day: '2026-10-14',
      startTime: '19:15',
      endTime: '19:16',
    });
  });
});
