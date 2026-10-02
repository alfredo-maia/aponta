# Cofre de Senhas (Multitenant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de Cofre de Senhas (Vault) ultra-seguro, onde Cliente Master gerencia as próprias senhas e Agentes acessam em modo estrito de leitura.
**Architecture:** Prisma Model (`Credential`) amarrado a `Organization`. Controller backend orientado a Ações (MCP-Ready via Swagger). View em React com proteção rigorosa para bloquear exclusão/criação por Agentes.
**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Tailwind, Lucide Icons.
**Spec:** `docs/superpowers/specs/2026-10-02-aponta-evolution-design.md`

## Global Constraints
- **Segurança Máxima:** A regra de deleção/edição deve ser imposta pelas Guards ou explicitamente no backend (HTTP 403) para que usuários burlem as amarras do Frontend. Agentes (`AGENT`, `AGENT_MASTER`) só podem realizar `GET /vault`.
- Interface baseada em componentes semânticos (`button`, `input`), sem bibliotecas completas shadcn.

## Review Focus
- **Acesso Cliente/Agente Bloqueado Mutativo:** Um `AGENT` pode tentar chamar a rota `POST /vault/credentials` usando cURL ou Postman. A API deve obrigatoriamente rejeitar (403), usando a camada de Guards.
- **Client Ocultação:** `Role.CLIENT` tentando `GET /vault` deve receber um 403 Forbidden diretamente na API, e o atalho sequer deve renderizar no FrontEnd.

---

### Task 1: Prisma Schema & Backend DTOs

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/vault/dto/create-credential.dto.ts`
- Create: `apps/api/src/vault/dto/update-credential.dto.ts`

**Interfaces:**
- Produces: `Credential` model on Prisma, DTOs for Create/Update with `@ApiProperty`.

- [ ] **Step 1: Adicionar modelo Credential no Prisma**
```prisma
model Credential {
  id             String       @id @default(uuid())
  name           String       // E.g. "PROD - RM (SUP)"
  username       String?
  password       String
  url            String?
  description    String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

- [ ] **Step 2: Gerar DTOs com validação (MCP-Ready)**
Em `create-credential.dto.ts`:
Criar campos obrigatórios com `IsString`, `IsNotEmpty`. Para `username`, `url`, `description`, usar `IsOptional`. Inserir todos anotados com `@ApiProperty()`.
Nota crítica: O DTO **NÃO** deve conter `organizationId`. A `organizationId` é injetada nativamente pelo controller baseando-se no `CurrentUser` (se for Client Master) ou exigida de forma segura via rota de Admin.

- [ ] **Step 3: Compilar Prisma**
Run: `pnpm exec nx run api:prisma-migrate-dev --name add_vault_credentials`

### Task 2: Implementando Serviços e Tenant Security (API)

**Files:**
- Create: `apps/api/src/vault/vault.service.ts`
- Create: `apps/api/src/vault/vault.controller.ts`
- Create: `apps/api/src/vault/vault.module.ts`
- Modify: `apps/api/src/app.module.ts` (Registrar VaultModule)

**Interfaces:**
- Consumes: `TenantHelper` criado na fundação core para o `findAll()` do Vault.

- [ ] **Step 1: Expandir o TenantHelper**
Adicionar suporte ao getCredentialWhere no `TenantHelper` limitando VISÃO.
- `ADMIN`: Retorna `{}` 
- `CLIENT_MASTER`: Retorna `{ organizationId: user.organizationId }`
- `AGENT/AGENT_MASTER`: Retorna `{}` (tem visão global read-only para a operação das base dos clientes).
- `CLIENT`: Fail Closed (403 ou ID travado).

- [ ] **Step 2: Criar Vault Service**
- `findAll(user)`: Puxa o Helper.
- `create(dto, user)`: Injeta a `organizationId` da org do User caso seja CLIENT_MASTER.
- `remove(id, user)`: Excluir.

- [ ] **Step 3: Criar Controller e Proteção**
Endpoints Restritos usando as Roles:
- `@Get()` -> `@Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER)`
- `@Post()`, `@Patch(':id')`, `@Delete(':id')` -> Restringir explicitamente via codigo ou guards. Ex: `@Roles(Role.ADMIN, Role.CLIENT_MASTER)`.

- [ ] **Step 4: Executar Lint/Test backend**
Run: `pnpm exec nx run-many -t typecheck,lint,test --projects=api`

### Task 3: Integração Frontend (Web) - Hooks & UI Oculta

**Files:**
- Create: `apps/web/src/pages/VaultPage.tsx`
- Modify: `apps/web/src/hooks/useVault.ts` (Implementar queries/mutations)
- Modify: `apps/web/src/components/Layout/Sidebar.tsx` (Adicionar item do Menu)
- Modify: `apps/web/src/router.tsx`

**Interfaces:**
- Consumes: Endpoints do Backend.

- [ ] **Step 1: Ocultação do Sidebar Menu**
No `Sidebar.tsx`, o menu "Cofre de Senhas" `['AGENT', 'AGENT_MASTER', 'ADMIN', 'CLIENT_MASTER'].includes(role)` deve liberar visibilidade. Para `CLIENT`, oculto.

- [ ] **Step 2: Construir a Página do Cofre e React Query**
Renderizar `useQuery(['vault'])`.
Condicional de botões de Edição/Remoção:
`if (['ADMIN', 'CLIENT_MASTER'].includes(user.role)) { render <CreateButton/>/<TrashIcon/> }`. Agente só vê a listagem, o nome, e botão simples de de "Copy to Clipboard" nas senhas (icon `Copy` do lucide-react).
Nota: O design NÃO DEVE misturar a lista. Agrupar logicamente se for Admin ou manter table line reta baseada em Tailwind.

- [ ] **Step 3: Teste Empírico e Validação do TDD UI**
Executar web: `pnpm exec nx run web-e2e:e2e` ou equivalente manual para confirmar render do Dashboard.

### Task 4: Revisão & Deploy

**Files:**
- Modified: Todos os da task.

- [ ] **Step 1: Adicionar testes para o Cofre na API** (Garantia de 403 do Agent).
- [ ] **Step 2: Commit do Módulo**
Run: `git add . && git commit -m "feat(vault): add secure password vault module with multi-tenant RBAC isolation"`