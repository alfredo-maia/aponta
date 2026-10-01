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
): SlaStatus | null {
  if (!deadline) {
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

  return elapsedFraction >= AT_RISK_THRESHOLD ? 'AT_RISK' : 'ON_TRACK';
}
