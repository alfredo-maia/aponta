/** DMTE-462 T3: stubs neutros (sem o comportamento), substituídos na implementação. */
export function isValidCron(_expression: string): boolean {
  return true;
}

export function nextRun(_expression: string, after: Date): Date {
  return after;
}
