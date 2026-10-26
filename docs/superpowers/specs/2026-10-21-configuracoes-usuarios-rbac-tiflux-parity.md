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

### Validação do Architect (DMTE-119)

Tarefa 1 (commit `d729bf9`) foi conferida linha a linha contra este SPEC: `schema.prisma` (join tables explícitas, `User.technicalGroupId`), a migration manual `20261021170000_add_permission_and_technical_groups` (tabelas/FKs/índices batem 1:1 com o schema), `permission-catalog.ts` (86 chaves, 5 categorias, sem duplicatas — 17 Administrativas + 22 Cliente + 13 Gestão + 10 Relatório + 24 Técnicas), os dois controllers (ADMIN-only em todos os handlers, como descrito) e `seed.ts` (idempotente via `findFirst` por nome + `upsert` no vínculo). Todos os critérios de aceite 1–6 se confirmam pela leitura do código. Correção de um número do SPEC original: a contagem real de `@Roles(...)` no código é **105 ocorrências em 20 controllers** (não ~85) — a Tarefa 2 deve tratar esse número como o escopo real, não uma estimativa. Além disso, há **42 comparações diretas `user.role === ...`/`.role ==` fora dos controllers** (majoritariamente em `apps/api/src/core/security/tenant.helper.ts`), que a Tarefa 2 **não** deve tocar (ver decisão abaixo).

As seções abaixo detalham os critérios de aceite das Tarefas 2–5, fechando a lacuna de ambiguidade apontada em DMTE-119. O critério 7 (suíte local verde) não pôde ser reexecutado neste ambiente de validação por falta de uma `DATABASE_URL` configurada (mesma limitação de ambiente sem Postgres local já registrada acima para a Tarefa 1) — a leitura de código substitui a reexecução para fins desta validação, mas o Developer deve confirmar a suíte verde normalmente ao iniciar a Tarefa 2.

### Tarefa 2 — Refactor da autorização

#### Decisão travada (confirmada nesta validação, lendo `tenant.helper.ts`)

`TenantHelper` (`apps/api/src/core/security/tenant.helper.ts`) já implementa toda a visibilidade multi-tenant (`getTicketWhere`, `getServiceDeskWhere`, `getCredentialWhere`, `getContractWhere`, `getAppointmentWhere`) com base direta no `Role` enum (família ADMIN/AGENT_MASTER/AGENT/CLIENT_MASTER/CLIENT) — não em permissões granulares. Confirmando a recomendação do Tech Lead: **`TenantHelper` fica fora do escopo da Tarefa 2, sem nenhuma alteração.** `Role` continua sendo a família grosseira que decide "o que o usuário pode ver" (escopo/tenant); `PermissionGroup` passa a decidir "o que o usuário pode fazer" (ação/endpoint), e só isso. Os dois sistemas convivem lado a lado — não há migração de um para o outro.

#### Escopo

- Novo decorator `@RequirePermission(...chaves: string[])` (análogo a `@Roles`), e um `PermissionsGuard` que resolve as permissões efetivas do usuário autenticado: união das permissões de todo `PermissionGroup` vinculado diretamente (`PermissionGroupUser`) **mais** as de todo `PermissionGroup` vinculado via o `TechnicalGroup` do usuário (`PermissionGroupTechnicalGroup`), deduplicada.
- `ADMIN` continua com bypass total (equivalente a ter todas as 86 permissões) — não depende de estar num `PermissionGroup` específico, para nunca haver um estado em que um ADMIN fica trancado para fora por um grupo mal configurado.
- Troca de **todos os 105 `@Roles(...)`** (20 controllers) por `@RequirePermission(...)` com a chave do catálogo mais próxima semanticamente (mapeamento 1:1 documentado numa tabela no PR, controller por controller) — exceto os handlers que hoje usam `@Roles(Role.ADMIN)` apenas como guarda de "é admin de verdade" sem relação com uma permissão de negócio (ex.: endpoints internos de manutenção, se existirem) — esses casos ficam com `@Roles(Role.ADMIN)` e devem ser listados explicitamente no PR com a justificativa.
- `RolesGuard` e `@Roles` continuam existindo (não removidos) para esses casos residuais e para não quebrar `TenantHelper`/testes que dependem de `user.role` no payload do JWT — o JWT continua carregando `role` como hoje.
- Nenhuma mudança de schema nesta tarefa (o modelo já existe desde a Tarefa 1).

#### Critérios de aceite (Tarefa 2)

1. `PermissionsGuard` resolve corretamente a união de permissões diretas + via `TechnicalGroup`, com teste unitário cobrindo: usuário só com vínculo direto, só via grupo de atendentes, via ambos (sem duplicar), e sem nenhum vínculo (nega tudo, exceto ADMIN).
2. ADMIN sempre passa em qualquer `@RequirePermission(...)`, mesmo sem nenhum `PermissionGroup` vinculado — teste unitário dedicado para esse caso.
3. Os 105 `@Roles(...)` atuais foram substituídos por `@RequirePermission(...)` ou explicitamente mantidos como `@Roles(Role.ADMIN)` com justificativa no PR — nenhum endpoint ficou sem guarda de autorização (checagem automatizada: todo handler `@Get/@Post/@Patch/@Delete` num `@Controller` com `@UseGuards(JwtAuthGuard, ...)` tem ou `@RequirePermission` ou `@Roles`).
4. `tenant.helper.ts` não sofreu nenhuma alteração (diff do arquivo vazio nesta tarefa).
5. Testes de regressão (os specs de controller/service já existentes que hoje dependem de `@Roles`) atualizados para o novo decorator sem perder cobertura — nenhum teste removido sem substituição equivalente.
6. Suíte completa (`nx run-many -t test,lint,typecheck --projects=api`) verde antes do commit.

### Tarefa 3 — APIs

#### Gap adicional encontrado nesta validação (não previsto no SPEC original)

`UsersController`/`UsersService` já têm `GET /users` (lista **todos** os usuários, sem paginação/busca/filtro) e `PATCH /users/:id` (atualiza `role`/`organizationId`). O que falta de verdade: paginação + busca por nome/e-mail, filtro por `PermissionGroup`/`TechnicalGroup`, e **ativar/inativar** — este último não tem onde guardar o estado hoje, porque **o model `User` não tem nenhum campo `active`/`isActive`** (diferente de `Organization.active`, que já existe). Isso é uma lacuna real: a Tarefa 3 precisa de uma migration aditiva (`User.active Boolean @default(true)`) antes de poder implementar o toggle "Usuário ativo" da aba Perfil do Tiflux — não é só código novo, é mais um ajuste de schema.

#### Escopo

- Migration aditiva: `User.active Boolean @default(true)` (não quebra nenhum usuário existente — todos nascem ativos).
- `GET /users` ganha paginação (`page`/`pageSize`), busca (`q` — nome ou e-mail) e filtro opcional por `technicalGroupId`/`permissionGroupId`, mantendo retrocompatibilidade com qualquer chamador atual que não passe esses query params (resposta hoje é um array; decidir e documentar no PR se a resposta paginada muda o formato para `{ items, total, page, pageSize }` — isso é uma mudança de contrato que quebra chamadores existentes do array simples, então deve ser avaliada com cuidado contra o frontend atual antes de implementar).
- `PATCH /users/:id/active` (ou campo `active` dentro do `PATCH /users/:id` existente — decisão do Developer, documentar a escolhida) para ativar/inativar.
- Conectar usuário aos grupos na própria resposta de `GET /users` e `GET /users/:id` (grupos de permissão + grupo de atendentes, para preencher as colunas da tela "Usuários" do Tiflux).
- Um usuário inativo (`active: false`) deve continuar conseguindo ser **lido** (histórico/auditoria de tickets antigos não pode quebrar), mas **não deve conseguir autenticar** — `AuthService.validateUser`/login precisa checar `active` e recusar login com uma mensagem clara, não um erro genérico.

#### Critérios de aceite (Tarefa 3)

1. Migration `User.active` aplicada, default `true`, nenhum usuário existente fica inativo após a migration.
2. `GET /users` suporta paginação e busca; resposta documentada no PR (array simples vs. envelope paginado) com decisão explícita sobre compatibilidade do frontend atual.
3. Endpoint de ativar/inativar funciona e é coberto por teste unitário (Prisma mockado) + o login de um usuário inativado passa a falhar com mensagem apropriada (teste no `AuthService`).
4. `GET /users`/`GET /users/:id` retornam os grupos (permissão + atendentes) vinculados ao usuário.
5. Os novos endpoints usam `@RequirePermission('MANAGE_USERS')` (Tarefa 2 já deve estar mergeada) em vez de `@Roles(Role.ADMIN)`.
6. Suíte completa (`nx run-many -t test,lint,typecheck --projects=api`) verde antes do commit.

### Tarefa 4 — Frontend

#### Gap adicional encontrado nesta validação

`SettingsPage.tsx` hoje é uma lista plana de links (`Minha Conta`, e `Mesa` só para ADMIN) — não existe conceito de submenu. Também não existe nenhuma abstração de permissão no frontend: 18 arquivos checam `user?.role === 'ADMIN'` diretamente. Replicar o Tiflux (ocultar "Usuários"/"Grupos de atendentes"/"Grupos de permissões" por permissão granular, não só por `role === 'ADMIN'`) exige um hook novo, ex. `useHasPermission(key)`, que busca as permissões efetivas do usuário autenticado (endpoint novo ou calculado a partir do payload do JWT/perfil — decisão do Developer, documentar no PR) — isso é trabalho novo, não só telas.

#### Escopo

- Hook/seletor `useHasPermission(key: string)` (ou equivalente) consultando as permissões efetivas do usuário logado.
- Reestruturar `SettingsPage` para suportar submenus (pelo menos o submenu "Usuários" com os 4 itens: Minha conta / Usuários / Grupos de atendentes / Grupos de permissões), cada item visível conforme a permissão correspondente (`MANAGE_USERS`, `MANAGE_PERMISSION_GROUPS`) em vez do atual `isAdmin` hardcoded.
- Tela **Usuários** (lista com busca + colunas Nome/Grupos de permissões/Grupos de atendentes/Tipo/Status conforme mapeamento já postado em DMTE-84; detalhe com abas Perfil e Segurança — Segurança pode ficar como stub nesta tarefa se 2FA não for escopo desta feature, documentar a decisão no PR).
- Tela **Grupos de atendentes** (lista + detalhe com abas Informações/Equipe/Acessos).
- Tela **Grupos de permissões** (lista + detalhe: Nome/Descrição, vínculos, matriz de permissões por categoria com "Selecionar todos" por bloco, buscando o catálogo em `GET /permission-groups/catalog`).
- Toggle "Usuário ativo" na aba Perfil, consumindo o endpoint da Tarefa 3.
- Toda a cópia da UI em pt-BR (labels, estados vazio/erro/carregando), seguindo o padrão já usado no resto do Aponta.

#### Critérios de aceite (Tarefa 4)

1. Submenu "Usuários" aparece em Configurações com os 4 itens, cada um visível apenas para quem tem a permissão correspondente (teste: usuário sem `MANAGE_USERS` não vê o item "Usuários"; ADMIN vê todos).
2. Tela de Usuários lista, busca e pagina (consumindo a Tarefa 3), com toggle de ativar/inativar funcional.
3. Tela de Grupos de atendentes: CRUD completo nas 3 abas (Informações/Equipe/Acessos), cobrindo adicionar/remover membro, cliente e mesa de serviço.
4. Tela de Grupos de permissões: CRUD completo, matriz de permissões reflete exatamente o catálogo (86 chaves, 5 categorias), "Selecionar todos" por categoria funciona, e salvar reflete-se de fato num novo login do usuário afetado (fechado pelo E2E da Tarefa 5).
5. Nenhuma tela nova quebra o padrão de design system já existente (`EzCardItem` e demais componentes de `components/ds`, conforme o restante do Aponta).
6. Suíte completa (`nx run-many -t test,lint,typecheck --projects=web`) verde antes do commit.

#### Rastreamento desta entrega (DMTE-238, manifest `.delivery/deliveries/DMTE-238.json`)

Mapeamento dos critérios acima para os `AC-NN` do manifest v4, cada um com RED/GREEN comportamental próprio salvo em `.delivery/evidence/DMTE-238/`:

- **AC-01** — `GET /auth/me` passa a expor `isAdmin`/`permissions` efetivas (pré-requisito não previsto no SPEC original: o JWT só carrega `role`, nunca as chaves granulares do `PermissionGroup`) e o hook `useHasPermission` consome esse endpoint. Sustenta o critério 1 acima.
- **AC-02** — Critério 1: submenu "Usuários" em `SettingsPage`, 4 itens, visibilidade por `MANAGE_USERS`/`MANAGE_PERMISSION_GROUPS` em vez de `role === 'ADMIN'`.
- **AC-03** — Critério 2: tela de Usuários (lista paginada/busca, detalhe com abas Perfil/Segurança, toggle ativo). Segurança fica como stub nesta tarefa (2FA não é escopo desta feature).
- **AC-04** — Critério 3: tela de Grupos de atendentes (lista + detalhe Informações/Equipe/Acessos; adicionar/remover membro, cliente e mesa de serviço).
- **AC-05** — Critério 4: tela de Grupos de permissões (lista + detalhe com matriz por categoria, "Selecionar todos" por categoria, vínculos de usuário/grupo de atendentes).
- **AC-06** — Critério 5 (reuso de DS): avaliado por revisão de código (componentes de `components/ds` reaproveitados em todas as telas novas, nenhum DS paralelo), sem RED/GREEN dedicado — não é comportamento testável isoladamente.
- **AC-07** — Critério 6 (suíte verde): coberto pela própria evidência GREEN combinada (`nx run-many -t test --projects=api,web`, 0 falhas) mais `nx run-many -t lint,typecheck --projects=api,web` (0 erros) rodados antes do commit.

### Tarefa 5 — Testes e revisão final

#### Escopo

- E2E Playwright cobrindo o fluxo completo citado no SPEC original: criar um `PermissionGroup` com um subconjunto de permissões, vincular um usuário de teste, fazer login como esse usuário e confirmar que a UI/API realmente reflete a permissão concedida (ex.: um usuário só com `VIEW_AND_OPEN_TICKETS` não vê a tela de Usuários; um usuário com `MANAGE_USERS` vê e consegue operar).
- Suíte completa do monorepo (`nx run-many -t test,lint,typecheck`, todos os projetos) verde.
- Revisão por sub-agente independente com autoridade para reprovar, obrigatória antes de qualquer commit/PR — critério já herdado da classificação Tier 3 desta feature.
- Checklist de regressão manual (ou automatizada) nos 5 `TenantHelper.get*Where` existentes, confirmando que continuam se comportando exatamente como antes da Tarefa 2 (já que a Tarefa 2 não deveria ter tocado neles) — evita que uma mudança incidental em `Role`/JWT quebre visibilidade multi-tenant sem ser percebida.

#### Critérios de aceite (Tarefa 5)

1. Pelo menos um cenário E2E cobre criação de grupo → vínculo → mudança real de acesso observável (não apenas chamada de API isolada).
2. `nx run-many -t test,lint,typecheck` (sem `--projects`, todo o monorepo) verde.
3. Revisão do sub-agente aprovada e registrada (comentário/relatório anexado ao PR ou à issue) antes do merge.
4. Nenhuma regressão nos testes existentes de `TenantHelper`/multi-tenant (os specs já existentes continuam passando sem modificação de asserção).
5. PR aberto com CI verde (ou, se o ambiente de execução não tiver acesso ao CI real, descrito explicitamente o que falta para confirmar — nunca reportado como "pronto para produção" sem essa confirmação).

**AC-08** (manifest v4) — critério 1 acima: `apps/web-e2e/src/users-permissions.spec.ts` cobre o cenário completo (cria `PermissionGroup` só com `MANAGE_USERS` pela UI real de Grupos de permissões, vincula um usuário de teste pela mesma UI, faz logout/login real desse usuário e confirma que "Usuários" aparece em Configurações e que a tela realmente opera via `PATCH /users/:id/active`); roda junto do restante da suíte `web-e2e` (critério 4), sem alterar nenhum spec existente de `TenantHelper`.
