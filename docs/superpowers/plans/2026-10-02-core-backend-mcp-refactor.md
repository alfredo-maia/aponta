# Backend Core Refactor (Tenant & MCP Readiness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar o isolamento de acesso (Tenant / RBAC) no backend e preparar a camada DTO com schemas rigorosos e documentados (Swagger/OpenAPI) para integração nativa com o Model Context Protocol (MCP).

**Architecture:** 
1. **TenantService Helper:** Um provider central que constrói a base da query Prisma (`where` clause) dependendo do Role do usuário, eliminando a duplicação em múltiplos módulos (Cofre, Contratos, Tickets).
2. **OpenAPI (MCP Adapter):** Integração rigorosa de `@nestjs/swagger` nos DTOs core e Controllers, gerando um contrato JSON exato que converte a API em ferramentas passíveis de uso por LLMs automaticamente.

**Tech Stack:** NestJS, Prisma, PostgreSQL, `@nestjs/swagger`, `class-validator`

**Spec:** `/home/hermes/repos/aponta/docs/superpowers/specs/2026-10-02-aponta-evolution-design.md`

## Global Constraints
- Nenhuma checagem estática de Role (`user.role === 'CLIENT'`) deve flexibilizar a segurança: o fallback (Role não mapeado) sempre falha fechado (deny).
- Todos os DTOs modificados ou criados devem implementar validação estrita do `class-validator` (ex: `whitelist`, `forbidNonWhitelisted`).

## Review Focus
- **Fuga de Tenant via Query Params:** Se o usuário tentar forçar `?organizationId=XYZ` tendo a role `CLIENT`, a API deve ignorar o param ou aplicar intersecção restritiva forçada (garantir sua própria ORG). O test previne leakage.
- **Falha de Mapeamento do MCP:** Caso falte uma anotação `@ApiProperty()`, o schema JSON gerado será vazio ("any"), o que quebra a previsibilidade do LLM ao usar a tool.
- **Service Desk Access (Agent):** Agentes devem apenas ver tickets de ServiceDesks para os quais possuem vínculo Pivot no Prisma (`_AgentServiceDesks`).

---

### Task 1: Setup da fundação MCP-Ready (Swagger / OpenAPI)

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: Um endpoint `GET /api-docs-json` que expõe toda a estrutura do projeto em formato padronizado OpenAPI para consumo pelo MCP.

- [ ] **Step 1: Instalar dependências MCP/Swagger**
Run: `pnpm add -w @nestjs/swagger` (Lembrando que é um workspace Nx).

- [ ] **Step 2: Configurar o Swagger em main.ts (setup code)**
Modificar `apps/api/src/main.ts` para injetar o DocumentBuilder:
```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// ... dentro de bootstrap()
const config = new DocumentBuilder()
  .setTitle('Aponta API - MCP Ready')
  .setDescription('API specifications for frontend and MCP LLM tools.')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

- [ ] **Step 3: Adicionar a validação restritiva Global**
Ainda no `main.ts`, reforçar o `ValidationPipe` com `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` para que nenhum param extra ultrapasse as fronteiras dos DTOs que são passadas para os LLMs via MCP.

### Task 2: Extrair helper universal de Tenant/RBAC (Core)

**Files:**
- Create: `apps/api/src/core/security/tenant.helper.ts`
- Test: `apps/api/src/core/security/tenant.helper.spec.ts`

**Interfaces:**
- Produces: `TenantHelper.getTicketWhere(user: CurrentUserPayload): Prisma.TicketWhereInput`

- [ ] **Step 1: Write the failing test**
Criar o spec para `TenantHelper`. O teste `test_client_master_isolation` avalia que se o usuário tiver `Role.CLIENT_MASTER` com `organizationId: '123'`, a função retornará `{ requester: { organizationId: '123' } }`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm exec nx run api:test --testFile="apps/api/src/core/security/tenant.helper.spec.ts"` 
Expected: FAIL

- [ ] **Step 3: Implement TenantHelper**
Criar a classe utilitária e nela portar a lógica solta hoje na `findAll` do `TicketsService` para os métodos estáticos. Centralize logic fallback (fail-closed se Role desconhecida).
```typescript
export class TenantHelper {
  static getTicketWhere(user: CurrentUserPayload): Prisma.TicketWhereInput {
      // Mover a cadeia if/else do TicketService para cá
      // CLIENT -> { requesterId: user.id }
      // CLIENT_MASTER -> { requester: { organizationId: user.organizationId } }
      // AGENT / AGENT_MASTER -> { serviceDesk: { agents: { some: { id: user.id } } } }
      // Else Fail / ADMIN returns {}
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Expected: PASS

- [ ] **Step 5: Commit**

### Task 3: Refatorar o TicketsService para o Tenant Helper Core

**Files:**
- Modify: `apps/api/src/tickets/tickets.service.ts`
- Modify: `apps/api/src/tickets/tickets.service.spec.ts`

**Interfaces:**
- Consumes: `TenantHelper.getTicketWhere` da Task 2.

- [ ] **Step 1: Modificar o comportamento da service**
Substituir o bloco extenso `if (currentUser.role === Role.CLIENT)` dentro de `TicketsService.findAll` e outras rotas de leitura pela chamada simples para o centralizado:
`const baseWhere = TenantHelper.getTicketWhere(currentUser);`
`const where = { ...baseWhere, ...queryFilters };`

- [ ] **Step 2: Run the existing tests**
Run: `pnpm exec nx run api:test --testFile="apps/api/src/tickets/tickets.service.spec.ts"`
Expected: PASS (Sem regressions).

- [ ] **Step 3: Commit**

### Task 4: Upgrade dos DTOs base para padrão MCP (Swagger)

**Files:**
- Modify: `apps/api/src/tickets/dto/create-ticket.dto.ts`
- Modify: `apps/api/src/tickets/dto/ticket-query.dto.ts`
- Modify: `apps/api/src/tickets/tickets.controller.ts`

**Interfaces:**
- Consumes: A funcionalidade do `@nestjs/swagger`.

- [ ] **Step 1: Adicionar `@ApiProperty` nos DTOs**
No arquivo `create-ticket.dto.ts`, adicionar a anotação para detalhar as props do LLM:
```typescript
@ApiProperty({ description: 'O ID UUID da fila (ServiceDesk) alvo do ticket.', example: '123e4567-e89b-12d3...'})
serviceDeskId!: string;
```
Repetir para todos os campos em `CreateTicketDto` e `TicketQueryDto`.

- [ ] **Step 2: Decorar o Controller com OpenApi Actions**
No `TicketsController`, adicionar anotações para mapear no MCP.
```typescript
@ApiOperation({ summary: 'Create a new ticket', description: 'Creates a ticket acting on behalf of the user...' })
@ApiResponse({ status: 201, description: 'Ticket successfully created.' })
```

- [ ] **Step 3: Run the tests and compile**
Run: `pnpm exec nx run-many -t typecheck,lint,test --projects=api`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/tickets/dto apps/api/src/tickets/tickets.controller.ts
git commit -m "feat: standardizing tickets core dtos and controllers for mcp via swagger"
```
