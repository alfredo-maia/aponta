import { CronTime } from 'cron';

const TIME_ZONE = 'America/Sao_Paulo';

/** Cron de 5 campos (minuto hora dia mês dia-da-semana), no fuso de São Paulo. */
export function isValidCron(expression: string): boolean {
  if (expression.trim().split(/\s+/).length !== 5) return false;
  try {
    new CronTime(expression, TIME_ZONE);
    return true;
  } catch {
    return false;
  }
}

/** Próxima execução estritamente depois de `after`. */
export function nextRun(expression: string, after: Date): Date {
  return new CronTime(expression, TIME_ZONE).getNextDateFrom(after).toJSDate();
}
