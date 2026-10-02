export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

/** Fraction of the elapsed window at which a still-open SLA becomes "at risk". */
const AT_RISK_THRESHOLD = 0.8;

/**
 * Classifies a single SLA deadline (response OR resolve) relative to `now`:
 *  - `null` when there is no deadline configured at all (e.g. legacy data).
 *  - `BREACHED` once `now` has reached or passed the deadline.
 *  - `AT_RISK` once 80% or more of the [createdAt, deadline] window has
 *    elapsed but the deadline hasn't been reached yet.
 *  - `ON_TRACK` otherwise.
 *
 * Pure function of (createdAt, deadline, now) — callers decide which
 * deadline (response/resolve) and whether a resolved/closed ticket should
 * even be evaluated (a ticket already resolved before its deadline should
 * not flip to BREACHED later just because wall-clock time moved on; that
 * policy lives in the caller, not here).
 */
export function getSlaStatus(
  createdAt: Date,
  deadline: Date | null,
  now: Date,
  slaAccumulatedPauseTime = 0,
  slaPausedAt: Date | null = null,
): SlaStatus | null {
  if (!deadline) {
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

  return elapsedFraction >= AT_RISK_THRESHOLD ? 'AT_RISK' : 'ON_TRACK';
}
