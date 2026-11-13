import { brasiliaHhMm, LockReason } from './pre-appointment-clock';

export type ApprovalType = 'LANCAMENTO' | 'CRONOMETRO_ENCERRADO';

/**
 * DMTE-462 T5: cada tipo de liberação é um evento com a própria permissão (como as liberações de limite do Sankhya).
 * Um tipo novo entra aqui e no enum `WorklogApprovalType`, sem mexer no fluxo de decisão.
 */
export const APPROVAL_TYPES: Record<ApprovalType, { label: string; permission: string }> = {
  LANCAMENTO: { label: 'Lançamento', permission: 'APPROVE_WORKLOG_ENTRY' },
  CRONOMETRO_ENCERRADO: { label: 'Cronômetro encerrado', permission: 'APPROVE_WORKLOG_SYSTEM_CLOSED' },
};

export type EntryBreak =
  | { kind: 'NO_AGENDA'; startsAt: Date; nearest?: { startTime: Date; endTime: Date } }
  | { kind: 'ABSENCE'; startsAt: Date; absence: { type: string; startTime: Date; endTime: Date } }
  | { kind: 'LIMIT'; limitMinutes: number; usedMinutes: number; entryMinutes: number };

/** dd/MM HH:mm em Brasília. */
function brasiliaDayHhMm(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${part('day')}/${part('month')} ${brasiliaHhMm(date)}`;
}

const WINDOW_RULE = 'A regra: o apontamento só é aceito direto de 1 dia antes do início da agenda do ticket até o fim dela.';
const ABSENCE_LABEL: Record<string, string> = { VACATION: 'Férias', ABSENCE: 'Ausência' };

/** Texto para quem decide a liberação do Lançamento: o que aconteceu, a regra quebrada e os números. */
export function explainEntryBreak(breakage: EntryBreak): string {
  if (breakage.kind === 'NO_AGENDA') {
    const start = brasiliaDayHhMm(breakage.startsAt);
    const where = breakage.nearest
      ? ` A agenda mais próxima deste ticket vai de ${brasiliaDayHhMm(breakage.nearest.startTime)} a ${brasiliaDayHhMm(breakage.nearest.endTime)}.`
      : ' O consultor não tem agenda neste ticket.';
    return `O início ${start} não cai na janela de atendimento.${where} ${WINDOW_RULE}`;
  }
  if (breakage.kind === 'ABSENCE') {
    const label = ABSENCE_LABEL[breakage.absence.type] ?? 'Ausência';
    return `O início ${brasiliaDayHhMm(breakage.startsAt)} cai em um período de ${label.toLowerCase()} do consultor, de ${brasiliaDayHhMm(breakage.absence.startTime)} a ${brasiliaDayHhMm(breakage.absence.endTime)}. ${label}: a regra é que não se aponta hora nesse período.`;
  }
  const excess = breakage.usedMinutes + breakage.entryMinutes - breakage.limitMinutes;
  return `O lançamento tem ${breakage.entryMinutes} min e a agenda já tem ${breakage.usedMinutes} min apontados, para um limite de ${breakage.limitMinutes} min: passa ${excess} min do limite. A regra: a soma dos apontamentos não pode passar da duração da agenda.`;
}

const CLOSED_BECAUSE: Record<LockReason, (limit: number | null) => string> = {
  LIMIT: (limit) => (limit === null
    ? 'o tempo trabalhado atingiu o limite da agenda'
    : `o tempo trabalhado atingiu o limite da agenda (${limit} min)`),
  PAUSE_EXPIRED: () => 'ficou pausado por mais de 2 dias',
  WINDOW_CLOSED: () => 'a janela da agenda fechou com o cronômetro pausado',
};

/** Texto para quem decide a liberação do Cronômetro encerrado pelo sistema. */
export function explainSystemClosed(reason: LockReason, ctx: { limitMinutes: number | null }): string {
  return `O sistema encerrou o cronômetro porque ${CLOSED_BECAUSE[reason](ctx.limitMinutes)}. A conversão em apontamento depende de liberação, e o horário registrado não pode ser mudado pelo consultor.`;
}
