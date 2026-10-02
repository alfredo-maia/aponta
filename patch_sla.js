const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/scheduling/sla-status.ts', 'utf8');

code = code.replace(
  /export function getSlaStatus\([\s\S]*?\): SlaStatus \| null \{/,
  `export function getSlaStatus(
  createdAt: Date,
  deadline: Date | null,
  now: Date,
  slaAccumulatedPauseTime: number = 0,
  slaPausedAt: Date | null = null,
): SlaStatus | null {`
);

const oldLogic = `  if (!deadline) {
    return null;
  }
  if (now.getTime() >= deadline.getTime()) {
    return 'BREACHED';
  }

  const totalMs = deadline.getTime() - createdAt.getTime();
  if (totalMs <= 0) {
    // Degenerate/misconfigured window (deadline <= createdAt): treat as
    // at-risk rather than throwing, since we already know it's not
    // breached yet (checked above) and "on track" would be misleading.
    return 'AT_RISK';
  }

  const elapsedMs = now.getTime() - createdAt.getTime();
  const elapsedFraction = elapsedMs / totalMs;

  return elapsedFraction >= AT_RISK_THRESHOLD ? 'AT_RISK' : 'ON_TRACK';`

const newLogic = `  if (!deadline) {
    return null;
  }
  
  let currentPauseMs = 0;
  if (slaPausedAt) {
    currentPauseMs = Math.max(0, now.getTime() - slaPausedAt.getTime());
  }
  const totalPauseMs = (slaAccumulatedPauseTime * 60000) + currentPauseMs;
  
  const effectiveDeadlineMs = deadline.getTime() + totalPauseMs;
  
  if (now.getTime() >= effectiveDeadlineMs) {
    return 'BREACHED';
  }

  const totalMs = effectiveDeadlineMs - createdAt.getTime();
  if (totalMs <= 0) {
    return 'AT_RISK';
  }

  const rawElapsedMs = now.getTime() - createdAt.getTime();
  const activeElapsedMs = rawElapsedMs - totalPauseMs;
  
  const elapsedFraction = activeElapsedMs / (deadline.getTime() - createdAt.getTime());

  return elapsedFraction >= AT_RISK_THRESHOLD ? 'AT_RISK' : 'ON_TRACK';`

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/scheduling/sla-status.ts', code);
