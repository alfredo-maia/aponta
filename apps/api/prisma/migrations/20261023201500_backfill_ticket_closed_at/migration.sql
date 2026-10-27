-- Backfill: for tickets already in a terminal state (CLOSED/RESOLVED), set
-- closedAt from the most recent STATUS_CHANGED audit row that transitioned
-- the ticket into CLOSED or RESOLVED (SPEC DMTE-137 D8/Q1 — there is no
-- resolvedAt/closedAt history before this migration, so the audit trail is
-- the only source of truth for when the ticket actually closed).
UPDATE "Ticket" t
SET "closedAt" = latest."createdAt"
FROM (
  SELECT DISTINCT ON ("ticketId") "ticketId", "createdAt"
  FROM "TicketAudit"
  WHERE "action" = 'STATUS_CHANGED' AND "newVal" IN ('CLOSED', 'RESOLVED')
  ORDER BY "ticketId", "createdAt" DESC
) AS latest
WHERE t."id" = latest."ticketId"
  AND t."status" IN ('CLOSED', 'RESOLVED')
  AND t."closedAt" IS NULL;
