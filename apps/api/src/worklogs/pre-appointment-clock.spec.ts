import { autoCloseDecision, ClockPre, PAUSE_EXPIRY_MS, workedMs } from './pre-appointment-clock';

const MIN = 60_000;
const at = (hhmm: string, day = '2026-11-12') => new Date(`${day}T${hhmm}:00Z`);
const pre = (over: Partial<ClockPre> = {}): ClockPre => ({
  beginning: at('08:30'), pausedAt: null, pausedMs: 0, limitMinutes: 240, windowEndsAt: null, ...over,
});

describe('relógio do pré-apontamento (DMTE-462 T4)', () => {
  it('AC-17: o tempo trabalhado desconta as pausas já encerradas', () => {
    expect(workedMs(pre(), at('10:00'))).toBe(90 * MIN);
    expect(workedMs(pre({ pausedMs: 10 * MIN }), at('10:00'))).toBe(80 * MIN);
  });

  it('AC-17: pausado, o tempo trabalhado para no instante da pausa', () => {
    expect(workedMs(pre({ pausedAt: at('09:00') }), at('11:00'))).toBe(30 * MIN);
    expect(workedMs(pre({ pausedAt: at('09:00'), pausedMs: 5 * MIN }), at('23:00'))).toBe(25 * MIN);
  });

  it('AC-18: fecha quando o tempo trabalhado atinge a duração da agenda, com fim = início + duração', () => {
    expect(autoCloseDecision(pre(), at('12:29'))).toBeNull();
    expect(autoCloseDecision(pre(), at('12:30'))).toEqual({ endsAt: at('12:30'), reason: 'LIMIT' });
  });

  it('AC-18: a pausa estende o relógio, mas o fim do apontamento continua início + duração', () => {
    const paused = pre({ pausedMs: 30 * MIN });
    expect(autoCloseDecision(paused, at('12:59'))).toBeNull();
    expect(autoCloseDecision(paused, at('13:00'))).toEqual({ endsAt: at('12:30'), reason: 'LIMIT' });
  });

  it('AC-18: sem limite (compromisso que ignora a regra ou permissão de hora inicial), nunca fecha por limite', () => {
    expect(autoCloseDecision(pre({ limitMinutes: null }), at('23:00', '2026-11-20'))).toBeNull();
  });

  it('AC-19: pausa com 2 dias ou mais encerra com o tempo trabalhado até a pausa', () => {
    const paused = pre({ pausedAt: at('09:00') });
    const expiry = new Date(at('09:00').getTime() + PAUSE_EXPIRY_MS);
    expect(autoCloseDecision(paused, new Date(expiry.getTime() - MIN))).toBeNull();
    expect(autoCloseDecision(paused, expiry)).toEqual({ endsAt: at('09:00'), reason: 'PAUSE_EXPIRED' });
  });

  it('AC-19 e AC-20: pausado quando a janela da agenda fecha, encerra e trava', () => {
    const paused = pre({ pausedAt: at('09:00'), windowEndsAt: at('12:00') });
    expect(autoCloseDecision(paused, at('11:59'))).toBeNull();
    expect(autoCloseDecision(paused, at('12:01'))).toEqual({ endsAt: at('09:00'), reason: 'WINDOW_CLOSED' });
  });

  it('AC-19: com a pausa tendo acumulado antes, o fim é início + tempo trabalhado até a última pausa', () => {
    const paused = pre({ pausedAt: at('10:00'), pausedMs: 15 * MIN });
    expect(autoCloseDecision(paused, new Date(at('10:00').getTime() + PAUSE_EXPIRY_MS))).toEqual({ endsAt: at('09:45'), reason: 'PAUSE_EXPIRED' });
  });
});
