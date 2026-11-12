import { buildJobHandlers } from './job-handlers';

describe('buildJobHandlers (DMTE-462 T4)', () => {
  it('AC-18: a tarefa WORKLOG_AUTOCLOSE chama o fechamento automático com o instante atual', async () => {
    const autoClose = { run: jest.fn().mockResolvedValue(2) };
    const handlers = buildJobHandlers(autoClose);
    await handlers['WORKLOG_AUTOCLOSE']();
    expect(autoClose.run).toHaveBeenCalledWith(expect.any(Date));
  });

  it('mantém a tarefa de verificação do T3', () => {
    expect(Object.keys(buildJobHandlers({ run: jest.fn() })).sort()).toEqual(['HEARTBEAT', 'WORKLOG_AUTOCLOSE']);
  });
});
