import { AppointmentType } from '@prisma/client';
import { evaluateWorklogWindow, WindowAppointment } from './agenda-window';

const agenda = (over: Partial<WindowAppointment> = {}): WindowAppointment => ({
  id: 'ag-1', type: AppointmentType.AGENDA, ticketId: 'ticket-1', ignoresWorklogRule: false,
  startTime: new Date('2026-11-12T11:00:00Z'), endTime: new Date('2026-11-12T15:00:00Z'), ...over,
});
const AT = new Date('2026-11-12T13:00:00Z');

describe('evaluateWorklogWindow (DMTE-462 T2)', () => {
  it('AC-06: aceita dentro da agenda do ticket e devolve a agenda e o limite em minutos', () => {
    expect(evaluateWorklogWindow([agenda()], 'ticket-1', AT)).toEqual({ ok: true, appointmentId: 'ag-1', limitMinutes: 240 });
  });

  it('AC-06: aceita a partir de 1 dia antes do início da agenda e recusa antes disso', () => {
    const later = agenda({ startTime: new Date('2026-11-13T12:00:00Z'), endTime: new Date('2026-11-13T16:00:00Z') });
    expect(evaluateWorklogWindow([later], 'ticket-1', AT)).toMatchObject({ ok: true, appointmentId: 'ag-1' });
    expect(evaluateWorklogWindow([later], 'ticket-1', new Date('2026-11-12T11:59:00Z'))).toEqual({ ok: false, reason: 'NO_AGENDA' });
  });

  it('AC-06: recusa depois do fim da agenda e quando a agenda é de outro ticket', () => {
    expect(evaluateWorklogWindow([agenda()], 'ticket-1', new Date('2026-11-12T15:01:00Z'))).toEqual({ ok: false, reason: 'NO_AGENDA' });
    expect(evaluateWorklogWindow([agenda({ ticketId: 'outro' })], 'ticket-1', AT)).toEqual({ ok: false, reason: 'NO_AGENDA' });
  });

  it('AC-08: ausência ou férias que cobrem o instante recusam, mesmo havendo agenda', () => {
    const absence = agenda({ id: 'aus', type: AppointmentType.ABSENCE, ticketId: null });
    const vacation = agenda({ id: 'fer', type: AppointmentType.VACATION, ticketId: null });
    expect(evaluateWorklogWindow([agenda(), absence], 'ticket-1', AT)).toEqual({ ok: false, reason: 'ABSENCE' });
    expect(evaluateWorklogWindow([agenda(), vacation], 'ticket-1', AT)).toEqual({ ok: false, reason: 'ABSENCE' });
  });

  it('AC-09: com duas agendas, vale a que inclui o instante; em empate, a que começa primeiro', () => {
    const early = agenda({ id: 'amanha', startTime: new Date('2026-11-13T12:00:00Z'), endTime: new Date('2026-11-13T14:00:00Z') });
    const current = agenda({ id: 'agora' });
    expect(evaluateWorklogWindow([early, current], 'ticket-1', AT)).toMatchObject({ appointmentId: 'agora' });
    const a = agenda({ id: 'a', startTime: new Date('2026-11-12T10:00:00Z') });
    const b = agenda({ id: 'b', startTime: new Date('2026-11-12T12:00:00Z') });
    expect(evaluateWorklogWindow([b, a], 'ticket-1', AT)).toMatchObject({ appointmentId: 'a' });
  });

  it('AC-09 e AC-12: a agenda do ticket vence o compromisso que ignora a regra, mesmo que este comece antes (o limite vale)', () => {
    const free = agenda({ id: 'livre', ticketId: null, ignoresWorklogRule: true, startTime: new Date('2026-11-12T09:00:00Z') });
    expect(evaluateWorklogWindow([free, agenda()], 'ticket-1', AT)).toEqual({ ok: true, appointmentId: 'ag-1', limitMinutes: 240 });
  });

  it('AC-12: compromisso que ignora a regra libera qualquer ticket, sem limite de horas', () => {
    const free = agenda({ id: 'livre', ticketId: null, ignoresWorklogRule: true });
    expect(evaluateWorklogWindow([free], 'ticket-1', AT)).toEqual({ ok: true, appointmentId: 'livre', limitMinutes: null });
  });
});
