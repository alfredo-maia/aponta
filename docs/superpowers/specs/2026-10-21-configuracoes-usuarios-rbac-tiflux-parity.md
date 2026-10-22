## Configurações > Usuários — paridade completa com o TiFlux (DMTE-84)

### Contexto

Sub-issue de DMTE-81 (categoria "Usuários" da tela de Configurações). Decisão do usuário (DMTE-84, comentários): paridade **completa** e **fiel** ao Tiflux, mesmo que envolva muitas alterações — inclusive no modelo de autorização do backend, não só na UI.

Investigação feita ao vivo no Tiflux real da DM Tecnologia via Playwright (capturas anexadas em DMTE-84): o submenu "Usuários" dentro de Configurações tem 4 itens — **Minha conta** (já existe no Aponta, `/my-account`), **Usuários**, **Grupos de atendentes**, **Grupos de permissões**.

### Gap identificado no Aponta (antes desta issue)

A premissa original da issue — "o RBAC do backend já cobre boa parte do necessário" — não se confirmou:
- Autorização é só um `enum Role` fixo (5 valores), checado direto em ~85 `@Roles(...)` espalhados por 20 controllers.
- Não existe `docs/architecture/01-rbac-and-workflows.md` (a pasta `docs/` nem existia antes do `docs/superpowers`).
- `AgentGroup` já existente é escopado por `organizationId` (equipe dedicada a um cliente) — conceito diferente do "Grupo de atendentes" do Tiflux, que é um time global usado para roteamento/relatórios, independente de cliente.
- Não existe endpoint de listagem/gestão completa de Usuários (paginação, busca, ativar/inativar).

### Plano de tarefas (SDD) — 5 tarefas, revisão independente antes do commit de cada uma

1. **Modelo de dados** (esta tarefa) — `PermissionGroup`, `TechnicalGroup`, catálogo de permissões, seed.
2. **Refactor da autorização** — decorator `@RequirePermission`, resolução de permissões efetivas do usuário (direta + via `TechnicalGroup`), mantendo o `Role` enum como "família" grosseira por trás do `PermissionGroup` (decisão confirmada com o usuário: evita reescrever de uma vez toda a lógica de tenant/visibilidade que já depende de `Role`).
3. **APIs** — CRUD completo de Usuários (lista paginada/com busca, ativar/inativar), conectando-os aos novos grupos.
4. **Frontend** — submenu "Usuários" em Configurações + telas de Usuários / Grupos de atendentes / Grupos de permissões.
5. **Testes e revisão final** — E2E Playwright cobrindo o fluxo completo (criar grupo, atribuir, verificar mudança de acesso), suíte completa, revisão por sub-agente independente, deploy.

### Esta tarefa (1 de 5): Modelo de dados

#### Prisma (`apps/api/prisma/schema.prisma`)

- `User.technicalGroupId String?` + relação para `TechnicalGroup` — seleção única, como a combobox "Grupo de atendente" no perfil do usuário no Tiflux real.
- `PermissionGroup { id, name, description, permissions: String[] }` — lista plana de chaves do catálogo (ver `apps/api/src/permission-groups/permission-catalog.ts`, ~86 permissões nas 5 categorias reais do Tiflux: Administrativas / Cliente / Gestão / Relatório / Técnicas) em vez de ~80 colunas booleanas, para não precisar de migration a cada permissão nova.
- `TechnicalGroup { id, name, description, dailyWorklogEmailEnabled, scheduleEnabled }` — campos da aba "Informações" do Tiflux real.
- Join tables **explícitas** (não m:n implícito do Prisma): `PermissionGroupUser`, `PermissionGroupTechnicalGroup`, `TechnicalGroupOrganization`, `TechnicalGroupServiceDesk`. Decisão deliberada: este ambiente não tem Postgres local para gerar a migration via `prisma migrate dev` (sem Docker disponível), então a migration foi escrita à mão — tabelas de junção implícitas do Prisma dependem de uma convenção de nomeação/ordem alfabética de colunas A/B (`_AgentServiceDesks` já é um pitfall documentado neste projeto) que é fácil de errar sem o `prisma migrate dev` real para gerar/validar; join tables explícitas evitam esse risco por completo.
- Um usuário pode pertencer a um `PermissionGroup` diretamente (`PermissionGroupUser`) e/ou indiretamente via o `TechnicalGroup` ao qual pertence (`PermissionGroupTechnicalGroup`) — replica a tela real do Tiflux, que lista os dois tipos de vínculo separadamente no detalhe de um grupo de permissão.

#### Backend — módulos novos

- `apps/api/src/permission-groups/` — `PermissionGroupsService`/`Controller`, DTOs (`CreatePermissionGroupDto`, `UpdatePermissionGroupDto`, `UpdatePermissionGroupPermissionsDto`), endpoint `GET /permission-groups/catalog` (serve o catálogo estático para o frontend montar a matriz de checkboxes).
- `apps/api/src/technical-groups/` — `TechnicalGroupsService`/`Controller`, DTOs, endpoints de membro (`/members/:userId`) e de acesso (`/organizations/:id`, `/service-desks/:id`) espelhando a aba "Acessos" do Tiflux.
- Guarda de autorização: **ADMIN-only** em todos os handlers novos (igual ao `UsersController` hoje) — Tarefa 2 troca isso pela permissão granular `MANAGE_PERMISSION_GROUPS`/`MANAGE_USERS`; esta tarefa só adiciona o modelo de dados, não muda quem pode fazer o quê.

#### Seed (`apps/api/prisma/seed.ts`)

Cria um `PermissionGroup` default por valor de `Role` (Administrador, Gerente de Atendimento, Atendente, Cliente Master, Cliente) com um conjunto de permissões plausível, e vincula os usuários seedados (`agent@aponta.com`, `admin@aponta.com`) ao grupo correspondente ao seu `role` atual — garante que a tela nova já tem dados reais no primeiro load, e que nenhum usuário existente fica sem grupo.

### Fora do escopo desta tarefa

- Qualquer troca de `@Roles(...)` existente por checagem granular — Tarefa 2.
- Endpoints de Usuários (paginação/busca/ativar) — Tarefa 3.
- Qualquer UI — Tarefa 4.

### Critérios de aceite (Tarefa 1)

1. `schema.prisma` válido (`prisma validate`) e `prisma generate` roda sem erro.
2. Migration SQL criada manualmente aplica as tabelas/FKs/índices corretos (revisão humana/reviewer confirma contra o schema, já que não há Postgres local para `prisma migrate dev` neste ambiente).
3. `PermissionGroupsService`/`Controller` e `TechnicalGroupsService`/`Controller` com CRUD completo + endpoints de vínculo (usuário, grupo de atendentes, cliente, mesa de serviço), cobertos por testes unitários (Prisma mockado).
4. Catálogo de permissões sem chaves duplicadas, fiel à matriz real do Tiflux (capturada em DMTE-84).
5. Seed idempotente cria os grupos default e vincula os usuários seedados sem duplicar linhas em reexecuções.
6. Nenhum `@Roles(...)` existente foi alterado nesta tarefa (mudança de autorização fica só na Tarefa 2).
7. Suíte local (`nx run-many -t test,lint,typecheck --projects=api,web`) verde antes do commit.
