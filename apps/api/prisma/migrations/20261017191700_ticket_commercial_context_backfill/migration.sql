-- Preserve the commercial organization at release time, independently of later requester moves.
-- Additive migration: old worklog snapshots and values remain untouched.
UPDATE "Ticket" AS ticket
SET "commercialOrganizationId" = requester."organizationId"
FROM "User" AS requester
WHERE ticket."requesterId" = requester.id
  AND ticket."commercialOrganizationId" IS NULL
  AND requester."organizationId" IS NOT NULL;

-- Record the explicit relationships already present before commercial enforcement.
INSERT INTO "OrganizationDeskEvent" (id, "organizationId", "serviceDeskId", linked)
SELECT gen_random_uuid()::text, relation."A", relation."B", true
FROM "_OrganizationToServiceDesk" AS relation;
