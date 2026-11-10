-- DMTE-464: ver valores de tickets passa a depender só de um grupo explícito.
-- Remove a permissão do grupo padrão "Administrador" e cria "Valores de tickets"
-- sem membros; quem entra nele é decidido em Configurações > Grupos de permissões.
UPDATE "PermissionGroup"
SET "permissions" = array_remove("permissions", 'VIEW_TICKET_VALUES'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Administrador' AND 'VIEW_TICKET_VALUES' = ANY("permissions");

INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Valores de tickets',
       'Quem pertence a este grupo vê os valores dos apontamentos dos tickets',
       ARRAY['VIEW_TICKET_VALUES'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Valores de tickets');
