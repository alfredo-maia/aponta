export type LockReason = 'LIMIT' | 'PAUSE_EXPIRED' | 'WINDOW_CLOSED';

export interface ClockPre {
  beginning: Date;
  pausedAt: Date | null;
  pausedMs: number;
  limitMinutes: number | null;
  windowEndsAt: Date | null;
}

export const PAUSE_EXPIRY_MS = 2 * 86_400_000;

/** DMTE-462 T4: stubs neutros (sem o comportamento), substituídos na implementação. */
export function workedMs(_pre: ClockPre, _now: Date): number {
  return 0;
}

export function autoCloseDecision(_pre: ClockPre, _now: Date): { endsAt: Date; reason: LockReason } | null {
  return null;
}
