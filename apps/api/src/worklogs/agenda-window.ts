import { AppointmentType } from '@prisma/client';

export interface WindowAppointment {
  id: string;
  type: AppointmentType;
  startTime: Date;
  endTime: Date;
  ticketId: string | null;
  ignoresWorklogRule: boolean;
}

export type WindowDecision =
  | { ok: true; appointmentId: string; limitMinutes: number | null }
  | { ok: false; reason: 'NO_AGENDA' | 'ABSENCE' };

export const WINDOW_LEAD_MS = 86_400_000;

/**
 * DMTE-462 T2: janela de atendimento = de 1 dia antes do início da agenda até o fim dela.
 * Ausência ou férias que cobrem o instante vencem qualquer agenda. Vale a agenda que inclui o
 * instante; em empate, a que começa primeiro. Compromisso que ignora a regra serve a qualquer ticket, sem limite.
 */
export function evaluateWorklogWindow(
  appointments: WindowAppointment[],
  ticketId: string,
  at: Date,
): WindowDecision {
  const t = at.getTime();
  const covers = (a: WindowAppointment) => a.startTime.getTime() <= t && t <= a.endTime.getTime();
  if (appointments.some((a) => a.type !== AppointmentType.AGENDA && covers(a))) {
    return { ok: false, reason: 'ABSENCE' };
  }
  const [pick] = appointments
    .filter((a) =>
      a.type === AppointmentType.AGENDA &&
      (a.ticketId === ticketId || a.ignoresWorklogRule) &&
      a.startTime.getTime() - WINDOW_LEAD_MS <= t && t <= a.endTime.getTime())
    .sort((a, b) => Number(!covers(a)) - Number(!covers(b)) || a.startTime.getTime() - b.startTime.getTime());
  if (!pick) return { ok: false, reason: 'NO_AGENDA' };
  return {
    ok: true,
    appointmentId: pick.id,
    limitMinutes: pick.ignoresWorklogRule ? null : Math.round((pick.endTime.getTime() - pick.startTime.getTime()) / 60000),
  };
}
