import { isValidCron, nextRun } from './cron';

describe('cron (DMTE-462 T3)', () => {
  it.each(['* * * * *', '*/5 * * * *', '0 8 * * 1-5', '30 2 1 * *'])('AC-15: aceita %s', (expression) => {
    expect(isValidCron(expression)).toBe(true);
  });

  it.each(['', 'abc', '61 * * * *', '* * * *', '*/0 * * * *', '0 0 31 2 *'])('AC-15: recusa "%s"', (expression) => {
    expect(isValidCron(expression)).toBe(false);
  });

  it('calcula a próxima execução depois do instante, no fuso de São Paulo', () => {
    expect(nextRun('0 8 * * *', new Date('2026-11-11T12:00:00Z'))).toEqual(new Date('2026-11-12T11:00:00Z'));
    expect(nextRun('*/5 * * * *', new Date('2026-11-11T12:00:00Z'))).toEqual(new Date('2026-11-11T12:05:00Z'));
    expect(nextRun('* * * * *', new Date('2026-11-11T12:00:30Z'))).toEqual(new Date('2026-11-11T12:01:00Z'));
  });
});
