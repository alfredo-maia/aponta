import { APPROVAL_TYPES, explainEntryBreak, explainSystemClosed } from './worklog-approval';

const D = (iso: string) => new Date(iso);

describe('registro de tipos de liberação (DMTE-462 T5)', () => {
  it('AC-31: cada tipo tem rótulo e a sua própria permissão', () => {
    expect(APPROVAL_TYPES.LANCAMENTO).toEqual({ label: 'Lançamento', permission: 'APPROVE_WORKLOG_ENTRY' });
    expect(APPROVAL_TYPES.CRONOMETRO_ENCERRADO).toEqual({ label: 'Cronômetro encerrado', permission: 'APPROVE_WORKLOG_SYSTEM_CLOSED' });
  });
});

describe('explainEntryBreak (DMTE-462 T5)', () => {
  it('AC-22: sem janela, diz o horário em Brasília, a regra e a agenda mais próxima', () => {
    const text = explainEntryBreak({
      kind: 'NO_AGENDA', startsAt: D('2026-11-12T11:10:00Z'),
      nearest: { startTime: D('2026-11-11T12:00:00Z'), endTime: D('2026-11-12T15:00:00Z') },
    });
    expect(text).toContain('O início 12/11 08:10');
    expect(text).toMatch(/não cai na janela/i);
    expect(text).toContain('A regra:');
    expect(text).toContain('11/11 09:00');
    expect(text).toContain('12/11 12:00');
  });

  it('AC-22: ticket sem agenda do consultor diz isso com todas as letras', () => {
    const text = explainEntryBreak({ kind: 'NO_AGENDA', startsAt: D('2026-11-12T11:10:00Z') });
    expect(text).toMatch(/não tem agenda/i);
    expect(text).toContain('A regra:');
  });

  it('AC-22: ausência e férias aparecem pelo nome e pelo período', () => {
    const vacation = explainEntryBreak({ kind: 'ABSENCE', startsAt: D('2026-11-12T11:10:00Z'), absence: { type: 'VACATION', startTime: D('2026-11-10T03:00:00Z'), endTime: D('2026-11-21T02:59:00Z') } });
    expect(vacation).toContain('Férias');
    expect(vacation).toContain('10/11 00:00');
    expect(vacation).toContain('20/11 23:59');
    expect(explainEntryBreak({ kind: 'ABSENCE', startsAt: D('2026-11-12T11:10:00Z'), absence: { type: 'ABSENCE', startTime: D('2026-11-12T11:00:00Z'), endTime: D('2026-11-12T20:00:00Z') } })).toContain('Ausência');
  });

  it('AC-22: acima do limite, mostra os minutos do lançamento, os já apontados, o limite e o excesso', () => {
    const text = explainEntryBreak({ kind: 'LIMIT', limitMinutes: 240, usedMinutes: 200, entryMinutes: 120 });
    expect(text).toContain('120 min');
    expect(text).toContain('200 min');
    expect(text).toContain('240 min');
    expect(text).toContain('80 min');
    expect(text).toContain('A regra:');
  });
});

describe('explainSystemClosed (DMTE-462 T5)', () => {
  it('AC-23: limite da agenda', () => {
    const text = explainSystemClosed('LIMIT', { limitMinutes: 240 });
    expect(text).toContain('240 min');
    expect(text).toMatch(/encerrou/i);
    expect(text).toMatch(/depende de liberação/i);
    expect(text).toMatch(/não pode ser mudado/i);
  });

  it('AC-23: pausa de 2 dias e janela fechada', () => {
    expect(explainSystemClosed('PAUSE_EXPIRED', { limitMinutes: null })).toContain('2 dias');
    expect(explainSystemClosed('WINDOW_CLOSED', { limitMinutes: 240 })).toMatch(/janela da agenda fechou/i);
  });

  it('AC-23: sem limite conhecido, o texto continua claro', () => {
    expect(explainSystemClosed('LIMIT', { limitMinutes: null })).toMatch(/limite da agenda/i);
  });
});
