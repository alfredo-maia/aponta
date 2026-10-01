import type { BusinessHour, Holiday } from '@prisma/client';

type BH = Pick<BusinessHour, 'weekday' | 'startTime' | 'endTime'>;
type Hol = Pick<Holiday, 'date'>;

function parseTimeOnDate(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

function isHoliday(date: Date, holidays: Hol[]): boolean {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return holidays.some((h) => {
    const hd = h.date;
    return (
      hd.getUTCFullYear() === y &&
      hd.getUTCMonth() === m &&
      hd.getUTCDate() === d
    );
  });
}

/** Windows configured for `date`'s weekday, sorted by start time, excluding holidays. */
function windowsForDay(date: Date, businessHours: BH[], holidays: Hol[]): BH[] {
  if (isHoliday(date, holidays)) return [];
  const weekday = date.getUTCDay();
  return businessHours
    .filter((bh) => bh.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Is `date` inside one of the configured business windows (and not a holiday)?
 * No configured business hours at all means 24/7 (always true) so SLA math
 * keeps working for service desks that haven't set up Expediente yet.
 */
export function isWithinBusinessHours(
  date: Date,
  businessHours: BH[],
  holidays: Hol[],
): boolean {
  if (businessHours.length === 0) return true;
  const windows = windowsForDay(date, businessHours, holidays);
  return windows.some((w) => {
    const start = parseTimeOnDate(date, w.startTime);
    const end = parseTimeOnDate(date, w.endTime);
    return date >= start && date < end;
  });
}

/**
 * Adds `hours` of *business* time to `start`, respecting the weekly
 * `businessHours` windows and skipping `holidays` entirely. If
 * `businessHours` is empty the service desk has no configured Expediente,
 * so this degrades to plain 24/7 addition (start + hours).
 */
export function addBusinessHours(
  start: Date,
  hours: number,
  businessHours: BH[],
  holidays: Hol[],
): Date {
  if (businessHours.length === 0) {
    return new Date(start.getTime() + hours * 3600 * 1000);
  }

  let remainingMs = hours * 3600 * 1000;
  let cursor = new Date(start);
  // Safety valve: never loop more than ~2 years of days looking for business time.
  let guard = 0;
  const MAX_ITERATIONS = 800;

  while (remainingMs > 0) {
    if (guard++ > MAX_ITERATIONS) {
      throw new Error(
        'addBusinessHours: could not find enough business time (check businessHours config)',
      );
    }

    const windows = windowsForDay(cursor, businessHours, holidays);
    let consumedInDay = false;

    for (const w of windows) {
      const winStart = parseTimeOnDate(cursor, w.startTime);
      const winEnd = parseTimeOnDate(cursor, w.endTime);

      if (cursor >= winEnd) continue; // window already passed today
      const segmentStart = cursor < winStart ? winStart : cursor;
      const availableMs = winEnd.getTime() - segmentStart.getTime();

      if (availableMs <= 0) continue;

      if (remainingMs <= availableMs) {
        cursor = new Date(segmentStart.getTime() + remainingMs);
        remainingMs = 0;
        consumedInDay = true;
        break;
      }

      remainingMs -= availableMs;
      cursor = new Date(winEnd);
      consumedInDay = true;
    }

    if (remainingMs > 0) {
      // Move to the start of the next calendar day and keep searching.
      if (!consumedInDay) {
        // No window today (weekend/holiday/before any window) — jump to
        // tomorrow 00:00 so we don't spin forever on empty days.
        cursor = new Date(
          Date.UTC(
            cursor.getUTCFullYear(),
            cursor.getUTCMonth(),
            cursor.getUTCDate() + 1,
            0,
            0,
            0,
            0,
          ),
        );
      } else {
        cursor = new Date(
          Date.UTC(
            cursor.getUTCFullYear(),
            cursor.getUTCMonth(),
            cursor.getUTCDate() + 1,
            0,
            0,
            0,
            0,
          ),
        );
      }
    }
  }

  return cursor;
}
