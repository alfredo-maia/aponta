-- DMTE-462 T1: editar hora inicial e final do apontamento depende só de um grupo explícito.
-- Cria "Edição de hora inicial" sem membros; quem entra nele é decidido em
-- Configurações > Grupos de permissões. O grupo padrão "Administrador" não recebe a chave.
INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Edição de hora inicial',
       'Quem pertence a este grupo digita a hora inicial e final dos apontamentos',
       ARRAY['EDIT_WORKLOG_START_TIME'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Edição de hora inicial');
