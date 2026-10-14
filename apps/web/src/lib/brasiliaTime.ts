export const BRASILIA_TZ = 'America/Sao_Paulo';

function pad2(value: number | string): string {
  return String(value).padStart(2, '0');
}

export function brasiliaDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRASILIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function brasiliaTimeString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRASILIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  let hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  if (hour === '24') hour = '00';
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function addMinutesToTime(timeOfDay: string, minutesToAdd: number): string {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const total = ((hours * 60 + minutes + minutesToAdd) % 1440 + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** Persist form wall-clock (Brasília) using the existing naive-Z convention. */
export function wallClockToStoredIso(day: string, timeOfDay: string): string {
  return `${day}T${timeOfDay}:00Z`;
}

/** Read stored naive-Z wall-clock back to HH:mm without shifting timezone. */
export function storedIsoToWallClock(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? brasiliaTimeString(new Date(iso));
}

export function prefillFromTimer(
  start: Date,
  end: Date,
  elapsedSeconds: number,
): { day: string; startTime: string; endTime: string } {
  const day = brasiliaDateString(start);
  const startTime = brasiliaTimeString(start);
  let endTime = brasiliaTimeString(end);
  if (startTime === endTime) {
    endTime = addMinutesToTime(startTime, Math.max(1, Math.ceil(elapsedSeconds / 60) || 1));
  }
  return { day, startTime, endTime };
}
