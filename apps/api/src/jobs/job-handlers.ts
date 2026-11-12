import { JobHandlers } from './jobs.service';

/** Os tipos de tarefa com código. Cada tipo novo entra aqui e ganha a linha na migração. */
export function buildJobHandlers(autoClose: { run(now: Date): Promise<number> }): JobHandlers {
  return {
    HEARTBEAT: async () => undefined,
    WORKLOG_AUTOCLOSE: async () => {
      await autoClose.run(new Date());
    },
  };
}
