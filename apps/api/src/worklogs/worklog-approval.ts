import { LockReason } from './pre-appointment-clock';

export type ApprovalType = 'LANCAMENTO' | 'CRONOMETRO_ENCERRADO';

/** DMTE-462 T5: stub neutro (sem o comportamento), substituído na implementação. */
export const APPROVAL_TYPES: Record<ApprovalType, { label: string; permission: string }> = {
  LANCAMENTO: { label: '', permission: '' },
  CRONOMETRO_ENCERRADO: { label: '', permission: '' },
};

export type EntryBreak =
  | { kind: 'NO_AGENDA'; startsAt: Date; nearest?: { startTime: Date; endTime: Date } }
  | { kind: 'ABSENCE'; startsAt: Date; absence: { type: string; startTime: Date; endTime: Date } }
  | { kind: 'LIMIT'; limitMinutes: number; usedMinutes: number; entryMinutes: number };

export function explainEntryBreak(_breakage: EntryBreak): string {
  return '';
}

export function explainSystemClosed(_reason: LockReason, _ctx: { limitMinutes: number | null }): string {
  return '';
}
