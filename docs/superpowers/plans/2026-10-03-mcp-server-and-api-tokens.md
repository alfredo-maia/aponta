# Servidor MCP (apps/mcp) + Gestão de API Tokens pelo Usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar vida ao pilar "MCP Readiness" do SDD. O usuário deve conseguir, na própria UI (Configurações > Tokens de API), gerar um Bearer Token pessoal de longa duração com o MESMO escopo RBAC da sua Role/Organização. Esse token alimenta um novo app standalone `apps/mcp` (stdio, `@modelcontextprotocol/sdk`) que expõe as ações de negócio da API como *tools* para LLMs (Claude Desktop, etc.), sem duplicar nenhuma regra de autorização.

**Architecture:**
- Backend: nova entidade `ApiToken` (hash do token, nunca o valor puro), nova `ApiTokenStrategy` (Passport) que decodifica o Bearer e popula o MESMO payload (`id, role, organizationId`) que o `JwtStrategy` já produz — reaproveita 100% do `TenantHelper`/Guards existentes.
- Frontend: nova aba/página "Tokens de API" dentro de `MyAccountPage` (ou rota própria `/my-account/tokens`), com fluxo "mostra uma vez, depois só hash".
- MCP: novo projeto Nx `apps/mcp`, app Node standalone rodando via stdio, lê `APONTA_API_TOKEN` + `APONTA_API_URL` do ambiente, traduz cada Tool MCP → chamada HTTP Bearer para a API REST já existente (Tickets, Contratos, Relatórios, Cofre, FAQ).

**Tech Stack:** NestJS, Prisma, Passport (`passport-http-bearer` ou strategy custom), React, `@modelcontextprotocol/sdk`, axios.
**Spec:** `docs/superpowers/specs/2026-10-02-aponta-evolution-design.md`

## Global Constraints
- **Token Puro Nunca Persiste:** Somente o HASH (bcrypt/sha256) do token vai para o banco. O valor puro só existe na memória do processo durante a criação e na tela (uma vez) do usuário.
- **Escopo = Role do Dono:** O Token NÃO tem papel próprio — ele herda `id/role/organizationId` do usuário que o gerou no exato instante da chamada (fresh lookup no banco, igual o JwtStrategy já faz). Se o Admin rebaixar um usuário para CLIENT, o Token antigo dele passa a responder como CLIENT automaticamente.
- **Revogação Imediata:** Delete de um `ApiToken` deve invalidar a próxima chamada instantaneamente (sem cache de validação).
- **Multi-Token:** Usuário pode ter N tokens simultâneos (ex.: um para Claude Desktop, outro para um script pessoal), cada um com `name` e `lastUsedAt` próprios para auditoria.
- **MCP App não acessa o banco diretamente.** Toda chamada do `apps/mcp` passa pela API HTTP (Bearer) — garante que a trava de RBAC do backend NUNCA seja bypassada por uma nova superfície.

## Review Focus
- **Token Reuse em Request Forjada:** Um token de AGENT, usado manualmente via cURL contra `/vault` ou `/contracts`, precisa retornar 403 — igual ocorreria com o JWT de sessão web dele.
- **Hash Collision/Lookup:** A estratégia de busca do token no banco deve ser O(1)-friendly (ex. indexar por um prefixo público do token, tipo `apta_xxxx...`, e comparar hash do restante) — não pode ser um full-table-scan comparando bcrypt em todos os tokens do banco.
- **UI Leak:** Depois do primeiro fechamento do modal "Copie seu token agora", nenhuma chamada subsequente da API (GET /api-tokens) pode devolver o valor puro — só metadados (name, createdAt, lastUsedAt, id).

---

### Task 1: Backend — Model `ApiToken` + Serviço de Geração/Hash

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/api-tokens/api-tokens.module.ts`
- Create: `apps/api/src/api-tokens/api-tokens.service.ts`
- Create: `apps/api/src/api-tokens/api-tokens.controller.ts`
- Create: `apps/api/src/api-tokens/dto/create-api-token.dto.ts`
- Create: `apps/api/src/api-tokens/api-tokens.service.spec.ts`

**Interfaces:**
- Produces: `POST /api-tokens` → `{ id, name, token }` (token só aparece aqui, uma vez).
- Produces: `GET /api-tokens` → `[{ id, name, createdAt, lastUsedAt }]` (sem o valor puro).
- Produces: `DELETE /api-tokens/:id` → revoga.

- [ ] **Step 1: Model Prisma**
```prisma
model ApiToken {
  id         String   @id @default(uuid())
  name       String
  prefix     String   // primeiros 8 chars do token puro, em texto plano, só para lookup rápido
  tokenHash  String   // bcrypt hash do token completo
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())
}
```
Adicionar `apiTokens ApiToken[]` em `model User`.
Rodar `prisma migrate dev --name add_api_tokens`.

- [ ] **Step 2: Serviço de geração**
`ApiTokensService.create(user, name)`:
  - Gera token puro: `apta_` + `crypto.randomBytes(32).toString('hex')`.
  - `prefix` = primeiros 12 caracteres do token puro (incluindo `apta_`), salvos em texto plano (serve só de índice de busca — não é segredo, pois o segredo é o restante).
  - `tokenHash` = `bcrypt.hash(tokenPuro, 10)`.
  - Salva no banco, retorna `{ id, name, token: tokenPuro }` — essa é a ÚNICA vez que o token puro sai do servidor.
  - `findAll(userId)`: retorna só metadados (nunca token/tokenHash).
  - `revoke(id, userId)`: valida ownership (ou ADMIN), deleta.

- [ ] **Step 3: Controller + Guards**
`@UseGuards(JwtAuthGuard)` em todas as rotas (só sessão web logada pode gerenciar tokens, não um outro token MCP).
`POST /api-tokens` body `{ name: string }` (DTO com `@ApiProperty`, `@IsString`, `@MaxLength(60)`).
`GET /api-tokens` lista os do usuário logado (ADMIN não vê tokens de outros — cada um gerencia o próprio).
`DELETE /api-tokens/:id`.

- [ ] **Step 4: Teste RED→GREEN**
`api-tokens.service.spec.ts`: garantir que `findAll` nunca inclui `tokenHash`/token puro no objeto retornado; que `revoke` de um token de outro usuário estoura `ForbiddenException`/`NotFoundException`.

### Task 2: Backend — `ApiTokenStrategy` (Passport) reaproveitando o payload do JWT

**Files:**
- Create: `apps/api/src/auth/api-token.strategy.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Create/Modify: `apps/api/src/auth/guards/jwt-or-token-auth.guard.ts` (um guard "OR" que aceita tanto JWT de sessão quanto Bearer de ApiToken)

**Interfaces:**
- Consumes: header `Authorization: Bearer apta_...` ou `Authorization: Bearer <jwt>`.
- Produces: mesmo shape de `req.user` que o `JwtStrategy` já produz (`{ id, email, role, organizationId }`), para o `TenantHelper` e todos os Guards de Role funcionarem sem alteração.

- [ ] **Step 1: Instalar dependência**
`pnpm add -w passport-http-bearer @types/passport-http-bearer`.

- [ ] **Step 2: `ApiTokenStrategy`**
Nome da strategy: `'bearer'`. No `validate(token)`:
  - Extrai o `prefix` (primeiros 12 chars) do token recebido.
  - `prisma.apiToken.findFirst({ where: { prefix } })` (índice rápido por prefix).
  - Se não achar → `UnauthorizedException`.
  - `bcrypt.compare(token, found.tokenHash)` — se falhar → `UnauthorizedException`.
  - Atualiza `lastUsedAt` (fire-and-forget, não bloquear a resposta).
  - Busca o `User` fresco (igual ao `JwtStrategy`) e retorna `{ id, email, role, organizationId }`.

- [ ] **Step 3: Guard combinado**
Como os controllers hoje usam `@UseGuards(JwtAuthGuard)`, criar um `JwtOrTokenAuthGuard extends AuthGuard(['jwt', 'bearer'])` do `@nestjs/passport` (ele já suporta múltiplas strategies em cascata) e trocar o uso nos controllers de negócio (Tickets, Contracts, Vault, Reports, Articles) de `JwtAuthGuard` → `JwtOrTokenAuthGuard`. A tela de sessão web continua indistinguível para os Guards de Role por baixo.

- [ ] **Step 4: Teste**
Teste de integração leve: token revogado retorna 401; token válido com role AGENT batendo em `/vault` (POST) retorna 403 (igual ao teste de sessão web já existente).

### Task 3: Frontend — Tela "Tokens de API" em Configurações

**Files:**
- Create: `apps/web/src/hooks/useApiTokens.ts`
- Modify: `apps/web/src/pages/MyAccountPage.tsx` (nova aba "Tokens de API")

**Interfaces:**
- Consumes: `/api-tokens` (GET, POST, DELETE) do Task 1.

- [ ] **Step 1: Hook**
`useApiTokens()`: `useQuery` para listar + `useMutation` para criar/revogar, invalidando a query após cada ação.

- [ ] **Step 2: UI**
Nova aba `tokens` ao lado de "Minha Conta"/"Segurança" no `MyAccountPage`.
- Formulário: input "Nome do token" (ex: "Claude Desktop") + botão "Gerar Token".
- Ao criar: abrir um modal/box destacado mostrando o token puro UMA VEZ com botão "Copiar" e aviso em vermelho: "Você não poderá ver este token novamente".
- Lista abaixo: tabela com Nome | Criado em | Último uso | Botão Revogar (com `window.confirm`).
- Essa aba é visível para TODAS as roles (cada usuário gerencia o próprio acesso de API, do Cliente ao Admin) — o escopo de dados retornado já é limitado pelo RBAC dele mesmo.

- [ ] **Step 3: Teste**
`MyAccountPage.test.tsx`: mock de criação exibindo o token uma vez; mock de revogação removendo da lista.

### Task 4: `apps/mcp` — App Standalone MCP (stdio)

**Files:**
- Create: `apps/mcp/project.json` (ou gerado via `nx g @nx/node:app mcp`)
- Create: `apps/mcp/src/main.ts`
- Create: `apps/mcp/src/tools/*.ts` (um arquivo por domínio: tickets, contracts, reports, vault, articles)
- Create: `apps/mcp/src/api-client.ts`
- Create: `apps/mcp/.env.example`

**Interfaces:**
- Consumes: API REST do Aponta via Bearer Token (`APONTA_API_TOKEN`, `APONTA_API_URL` — env vars).
- Produces: Tools MCP (stdio) listadas no manifesto, consumíveis por Claude Desktop/outros clientes MCP.

- [ ] **Step 1: Scaffold do projeto**
`pnpm add -w @modelcontextprotocol/sdk`
`npx nx g @nx/node:application mcp --directory=apps/mcp` (ou criar manualmente se o generator não plugar bem — ambos ok).

- [ ] **Step 2: `api-client.ts`**
Instância axios simples lendo `process.env.APONTA_API_URL` e `process.env.APONTA_API_TOKEN`, com header `Authorization: Bearer ...` fixo. Se as env vars não estiverem definidas, falhar no boot com mensagem clara.

- [ ] **Step 3: Tools**
Mapear 1:1 os endpoints action-driven do SDD (Seção 6) em Tools MCP, ex:
  - `list_tickets` (GET /tickets, aceita filtros)
  - `create_ticket`, `pause_ticket`, `resolve_ticket`
  - `get_billing_report`, `get_workload_report`
  - `list_vault_credentials` (ADMIN only — já garantido pelo backend, aqui só repassa o erro 403 de forma legível)
  - `list_articles`, `create_article`
Cada tool usa o schema JSON derivado dos DTOs (`@ApiProperty`) do backend — manter os nomes dos campos idênticos para mapeamento direto.
Erros HTTP 401/403 do backend devem virar mensagens de erro MCP claras (ex: "Seu token não tem permissão para esta ação"), nunca um crash do server stdio.

- [ ] **Step 4: `main.ts`**
Bootstrap do `McpServer` do SDK, registra todas as tools, conecta via `StdioServerTransport`.

- [ ] **Step 5: Documentação de uso**
`apps/mcp/README.md`: como gerar o token na UI, como configurar o `claude_desktop_config.json` apontando pro `node dist/apps/mcp/main.js` com as env vars.

### Task 5: Validação Global e Encerramento

- [ ] **Step 1: Validações Core**
`pnpm exec nx run-many -t build,lint,typecheck,test --projects=api,web,mcp`

- [ ] **Step 2: Teste manual E2E**
Gerar um token real via UI local, exportar nas env vars, rodar `node dist/apps/mcp/main.js` manualmente e confirmar que uma tool (ex: `list_tickets`) responde com dados reais filtrados pela Role do token.

- [ ] **Step 3: Commit + Fechamento**
Commit, push, fechar Issue `#36`, mover card para "Done" no board.
