// Financial values are integer cents; legacy Float values are never repriced.
export interface BillingCycle {
  cycleStart: string;
  cycleEnd: string;
  minutes: number;
}

const zone = 'America/Sao_Paulo';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function localParts(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}

function monthStart(year: number, month: number) {
  const wanted = Date.UTC(year, month - 1, 1);
  let instant = wanted;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(instant));
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    instant += wanted - represented;
  }
  return new Date(instant);
}

export function splitBillingCycles(start: Date, end: Date): BillingCycle[] {
  const result: BillingCycle[] = [];
  let cursor = start;
  let assigned = 0;
  const total = Math.round((end.getTime() - start.getTime()) / 60000);
  while (cursor < end) {
    const p = localParts(cursor);
    const from = monthStart(p.year, p.month);
    const to = monthStart(p.year, p.month + 1);
    const cut = to < end ? to : end;
    const cumulative = Math.round((cut.getTime() - start.getTime()) / 60000);
    const minutes = Math.min(total - assigned, cumulative - assigned);
    if (minutes > 0) result.push({ cycleStart: from.toISOString(), cycleEnd: to.toISOString(), minutes });
    assigned += minutes;
    cursor = cut;
  }
  return result;
}

export function valueContractMinutes(
  contract: { type: string; includedMinutes: number | null; hoursLimit: number | null; excessHourlyRateCents: number | null },
  minutes: number,
  consumed: number,
) {
  if (contract.type === 'FIXED_COVERAGE') return { coveredMinutes: minutes, excessMinutes: 0, amountCents: 0 };
  const allowance = contract.includedMinutes ?? (contract.hoursLimit === null ? null : contract.hoursLimit * 60);
  if (allowance === null) return { coveredMinutes: 0, excessMinutes: 0, amountCents: null };
  const coveredMinutes = Math.min(minutes, Math.max(0, allowance - consumed));
  const excessMinutes = minutes - coveredMinutes;
  const amountCents = excessMinutes === 0 ? 0 : contract.excessHourlyRateCents === null
    ? null : Math.round(excessMinutes * contract.excessHourlyRateCents / 60);
  return { coveredMinutes, excessMinutes, amountCents };
}
