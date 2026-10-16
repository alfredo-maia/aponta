/** Resolve a civil day in the contract timezone, including historical DST. */
export function brasiliaWallClockIso(day: string, time: string): string {
  const target = Date.parse(`${day}T${time}:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time) || !Number.isFinite(target)) {
    throw new Error('Data inválida');
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
    const localAsUtc = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const adjustment = target - localAsUtc;
    if (adjustment === 0) break;
    instant += adjustment;
  }
  return new Date(instant).toISOString();
}

export function brasiliaDayStartIso(day: string): string {
  return brasiliaWallClockIso(day, '00:00');
}

export function billingMonthStartIso(month: string): string {
  return brasiliaDayStartIso(`${month}-01`);
}
