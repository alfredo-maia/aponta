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

/** DMTE-462 T2: stub neutro (sem o comportamento), substituído na implementação. */
export function evaluateWorklogWindow(
  _appointments: WindowAppointment[],
  _ticketId: string,
  _at: Date,
): WindowDecision {
  return { ok: false, reason: 'NO_AGENDA' };
}
