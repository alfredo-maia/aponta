export type LockReason = 'LIMIT' | 'PAUSE_EXPIRED' | 'WINDOW_CLOSED';

export interface ClockPre {
  beginning: Date;
  pausedAt: Date | null;
  pausedMs: number;
  limitMinutes: number | null;
  windowEndsAt: Date | null;
}

export const PAUSE_EXPIRY_MS = 2 * 86_400_000;

/** Tempo trabalhado: do início até agora (ou até a pausa, se pausado), sem as pausas já encerradas. */
export function workedMs(pre: ClockPre, now: Date): number {
  const until = (pre.pausedAt ?? now).getTime();
  return Math.max(0, until - pre.beginning.getTime() - pre.pausedMs);
}

/**
 * Quando o sistema deve encerrar o cronômetro, e por quê. O fim do apontamento é início + tempo trabalhado
 * (as pausas não entram), então o apontamento convertido tem os minutos trabalhados.
 */
export function autoCloseDecision(pre: ClockPre, now: Date): { endsAt: Date; reason: LockReason } | null {
  const worked = workedMs(pre, now);
  const endsAt = new Date(pre.beginning.getTime() + worked);
  if (pre.pausedAt) {
    if (now.getTime() - pre.pausedAt.getTime() >= PAUSE_EXPIRY_MS) return { endsAt, reason: 'PAUSE_EXPIRED' };
    if (pre.windowEndsAt && now.getTime() > pre.windowEndsAt.getTime()) return { endsAt, reason: 'WINDOW_CLOSED' };
    return null;
  }
  if (pre.limitMinutes !== null && worked >= pre.limitMinutes * 60_000) {
    return { endsAt: new Date(pre.beginning.getTime() + pre.limitMinutes * 60_000), reason: 'LIMIT' };
  }
  return null;
}

/** HH:mm em Brasília (24 h), o formato de `initTime` e `endTime` dos pré-apontamentos. */
export function brasiliaHhMm(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const hour = (parts.find((part) => part.type === 'hour')?.value ?? '00').replace('24', '00');
  return `${hour.padStart(2, '0')}:${parts.find((part) => part.type === 'minute')?.value ?? '00'}`;
}
