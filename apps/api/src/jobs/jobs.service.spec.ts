import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';

type FakeJob = { type: string; cron: string; enabled: boolean; nextRunAt: Date; lastRunAt: Date | null; failures: number };

/** Banco em memória com a mesma forma que o executor usa: claim com FOR UPDATE SKIP LOCKED e atualizações. */
function fakeDatabase(jobs: FakeJob[]) {
  const store = { jobs, runs: [] as any[], skipLocked: false };
  const db: any = {
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(db)),
    $queryRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      store.skipLocked = store.skipLocked || strings.join('?').includes('SKIP LOCKED');
      const now = values[0] as Date;
      return Promise.resolve(store.jobs.filter((j) => j.enabled && j.nextRunAt <= now).map(({ type, cron, failures }) => ({ type, cron, failures })));
    }),
    scheduledJob: {
      findUnique: jest.fn(({ where }) => Promise.resolve(store.jobs.find((j) => j.type === where.type) ?? null)),
      findMany: jest.fn(() => Promise.resolve(store.jobs)),
      update: jest.fn(({ where, data }) => {
        const job = store.jobs.find((j) => j.type === where.type)!;
        Object.assign(job, data);
        return Promise.resolve(job);
      }),
    },
    jobRun: {
      create: jest.fn(({ data }) => {
        const run = { id: `run-${store.runs.length + 1}`, ...data };
        store.runs.push(run);
        return Promise.resolve(run);
      }),
      update: jest.fn(({ where, data }) => {
        const run = store.runs.find((r) => r.id === where.id)!;
        Object.assign(run, data);
        return Promise.resolve(run);
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn(({ where, data }) => {
        const stuck = store.runs.filter((r) => r.status === where.status && r.startedAt < where.startedAt.lt);
        stuck.forEach((r) => Object.assign(r, data));
        return Promise.resolve({ count: stuck.length });
      }),
    },
  };
  return { db, store };
}

const job = (over: Partial<FakeJob> = {}): FakeJob => ({
  type: 'HEARTBEAT', cron: '*/5 * * * *', enabled: true, nextRunAt: new Date('2026-11-11T11:59:00Z'), lastRunAt: null, failures: 0, ...over,
});
const NOW = new Date('2026-11-11T12:00:00Z');

describe('JobsService (DMTE-462 T3)', () => {
  afterEach(() => jest.useRealTimers());

  it('AC-14: executa a tarefa vencida uma única vez, agenda a próxima e registra a execução', async () => {
    const { db, store } = fakeDatabase([job()]);
    const handler = jest.fn().mockResolvedValue(undefined);
    const service = new JobsService(db, { HEARTBEAT: handler });

    await expect(service.runDue(NOW)).resolves.toEqual(['HEARTBEAT']);
    await service.runDue(NOW); // outra instância no mesmo instante

    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.jobs[0]).toMatchObject({ nextRunAt: new Date('2026-11-11T12:05:00Z'), lastRunAt: NOW, failures: 0 });
    expect(store.runs).toHaveLength(1);
    expect(store.runs[0]).toMatchObject({ jobType: 'HEARTBEAT', status: 'SUCCESS', attempt: 1, startedAt: NOW });
    expect(store.runs[0].finishedAt).toBeInstanceOf(Date);
  });

  it('AC-14: o claim das tarefas vencidas usa FOR UPDATE SKIP LOCKED (duas instâncias não repetem a tarefa)', async () => {
    const { db, store } = fakeDatabase([job()]);
    await new JobsService(db, { HEARTBEAT: jest.fn() }).runDue(NOW);
    expect(store.skipLocked).toBe(true);
  });

  it('AC-14: depois de uma reinicialização, a tarefa atrasada roda uma vez, sem repor as execuções perdidas', async () => {
    const { db, store } = fakeDatabase([job({ nextRunAt: new Date('2026-11-08T12:00:00Z') })]);
    const handler = jest.fn().mockResolvedValue(undefined);
    const restarted = new JobsService(db, { HEARTBEAT: handler });

    await restarted.runDue(NOW);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.jobs[0].nextRunAt).toEqual(new Date('2026-11-11T12:05:00Z'));
  });

  it('AC-14: a falha grava FAILED, o erro e a tentativa; um sucesso zera as tentativas', async () => {
    const { db, store } = fakeDatabase([job()]);
    const handler = jest.fn().mockRejectedValueOnce(new Error('falhou de propósito')).mockRejectedValueOnce(new Error('de novo')).mockResolvedValue(undefined);
    const service = new JobsService(db, { HEARTBEAT: handler });

    await service.runDue(NOW);
    expect(store.runs[0]).toMatchObject({ status: 'FAILED', error: 'falhou de propósito', attempt: 1 });
    expect(store.jobs[0].failures).toBe(1);

    await service.runDue(new Date('2026-11-11T12:05:00Z'));
    expect(store.runs[1]).toMatchObject({ status: 'FAILED', error: 'de novo', attempt: 2 });

    await service.runDue(new Date('2026-11-11T12:10:00Z'));
    expect(store.runs[2]).toMatchObject({ status: 'SUCCESS', attempt: 3 });
    expect(store.jobs[0].failures).toBe(0);
  });

  it('AC-14: tipo sem código registrado fica FAILED com a causa, sem derrubar as outras tarefas', async () => {
    const { db, store } = fakeDatabase([job({ type: 'SEM_CODIGO' }), job({ type: 'HEARTBEAT' })]);
    const handler = jest.fn().mockResolvedValue(undefined);
    await new JobsService(db, { HEARTBEAT: handler }).runDue(NOW);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.runs.find((r) => r.jobType === 'SEM_CODIGO')).toMatchObject({ status: 'FAILED', error: expect.stringMatching(/sem código|handler/i) });
  });

  it('AC-14: um cron inválido no banco desativa só aquela tarefa e registra a falha; as outras seguem', async () => {
    const { db, store } = fakeDatabase([job({ type: 'RUIM', cron: '0 0 31 2 *' }), job({ type: 'HEARTBEAT' })]);
    const handler = jest.fn().mockResolvedValue(undefined);
    await expect(new JobsService(db, { HEARTBEAT: handler, RUIM: jest.fn() }).runDue(NOW)).resolves.toEqual(['HEARTBEAT']);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.jobs.find((j) => j.type === 'RUIM')).toMatchObject({ enabled: false, failures: 1 });
    expect(store.runs.find((r) => r.jobType === 'RUIM')).toMatchObject({ status: 'FAILED', error: expect.stringMatching(/cron/i) });
  });

  it('AC-14: erro ao gravar o resultado de uma tarefa não impede as seguintes', async () => {
    const { db } = fakeDatabase([job({ type: 'A' }), job({ type: 'B' })]);
    db.jobRun.update.mockRejectedValueOnce(new Error('banco caiu'));
    const a = jest.fn().mockResolvedValue(undefined);
    const b = jest.fn().mockResolvedValue(undefined);
    await expect(new JobsService(db, { A: a, B: b }).runDue(NOW)).resolves.toEqual(['A', 'B']);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('AC-14: execução que ficou RUNNING por mais de 15 minutos (instância caiu) vira FAILED com a causa', async () => {
    const { db, store } = fakeDatabase([job({ nextRunAt: new Date('2026-11-12T00:00:00Z') })]);
    store.runs.push({ id: 'velha', jobType: 'HEARTBEAT', status: 'RUNNING', attempt: 1, startedAt: new Date('2026-11-11T10:00:00Z'), finishedAt: null, error: null });
    store.runs.push({ id: 'recente', jobType: 'HEARTBEAT', status: 'RUNNING', attempt: 1, startedAt: new Date('2026-11-11T11:55:00Z'), finishedAt: null, error: null });
    await new JobsService(db, { HEARTBEAT: jest.fn() }).runDue(NOW);
    expect(store.runs.find((r) => r.id === 'velha')).toMatchObject({ status: 'FAILED', error: expect.stringMatching(/interrompida/i) });
    expect(store.runs.find((r) => r.id === 'recente')).toMatchObject({ status: 'RUNNING' });
  });

  it('AC-14: tarefa desativada não roda', async () => {
    const { db } = fakeDatabase([job({ enabled: false })]);
    const handler = jest.fn();
    await expect(new JobsService(db, { HEARTBEAT: handler }).runDue(NOW)).resolves.toEqual([]);
    expect(handler).not.toHaveBeenCalled();
  });

  it('AC-15: recusa cron inválido e tipo inexistente', async () => {
    const { db, store } = fakeDatabase([job()]);
    const service = new JobsService(db, { HEARTBEAT: jest.fn() });
    await expect(service.update('HEARTBEAT', { cron: 'abc' })).rejects.toThrow(BadRequestException);
    await expect(service.update('NAO_EXISTE', { cron: '* * * * *' })).rejects.toThrow(NotFoundException);
    expect(store.jobs[0].cron).toBe('*/5 * * * *');
  });

  it('AC-15: o cron novo vale na hora, sem reiniciar: a próxima execução é recalculada', async () => {
    jest.useFakeTimers({ now: NOW });
    const { db, store } = fakeDatabase([job({ nextRunAt: new Date('2026-11-12T00:00:00Z') })]);
    const handler = jest.fn().mockResolvedValue(undefined);
    const service = new JobsService(db, { HEARTBEAT: handler });

    await service.update('HEARTBEAT', { cron: '0 8 * * *' });
    expect(store.jobs[0]).toMatchObject({ cron: '0 8 * * *', nextRunAt: new Date('2026-11-12T11:00:00Z') });

    await service.runDue(new Date('2026-11-11T12:30:00Z'));
    expect(handler).not.toHaveBeenCalled();
    await service.runDue(new Date('2026-11-12T11:00:00Z'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('AC-15: reativar a tarefa recalcula a próxima execução; desativar a mantém parada', async () => {
    jest.useFakeTimers({ now: NOW });
    const { db, store } = fakeDatabase([job({ enabled: false, nextRunAt: new Date('2026-11-01T00:00:00Z') })]);
    const service = new JobsService(db, { HEARTBEAT: jest.fn() });
    await service.update('HEARTBEAT', { enabled: true });
    expect(store.jobs[0]).toMatchObject({ enabled: true, nextRunAt: new Date('2026-11-11T12:05:00Z') });
    await service.update('HEARTBEAT', { enabled: false });
    expect(store.jobs[0].enabled).toBe(false);
  });

  it('AC-16: a listagem traz o cron atual de cada tipo com as últimas execuções', async () => {
    const { db } = fakeDatabase([job()]);
    const rows = await new JobsService(db, {}).list();
    expect(rows).toHaveLength(1);
    expect(db.scheduledJob.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: { runs: expect.objectContaining({ orderBy: { startedAt: 'desc' }, take: expect.any(Number) }) },
    }));
  });
});
