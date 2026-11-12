import { JobHandlers } from './jobs.service';

/** DMTE-462 T4: um ponto só para os tipos de tarefa com código. Stub neutro, substituído na implementação. */
export function buildJobHandlers(_autoClose: { run(now: Date): Promise<number> }): JobHandlers {
  return {
    HEARTBEAT: async () => undefined,
  };
}
