# Módulo de Contratos e Financeiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo financeiro (Contratos), que rege os acordos comerciais entre a operação e os clientes (Organization). Isso pavimentará o caminho para Relatórios de Faturamento.
**Architecture:** Prisma Model `Contract` acoplado a `Organization`. Controller robusto devolvendo DTOs estritos. Proteção multinível: Dados financeiros (ex: `lastAmendmentValue`, `monthlyValue`) são omitidos ou zerados caso o usuário solicitante seja um `AGENT` (que deve ver apenas parâmetros técnicos do contrato, como status e pacote de horas) utilizando interceptors ou mapeamento no nível do Service.
**Tech Stack:** NestJS, Prisma, React, React Query, TailwindCSS.
**Spec:** `docs/superpowers/specs/2026-10-02-aponta-evolution-design.md`

## Global Constraints
- **Omissão Contábil Rigorosa:** Se o `user.role` for `AGENT` ou `AGENT_MASTER`, o backend NUNCA deve trafegar campos financeiros pelo fio (network). Campos como `lastAmendmentValue` devem vir `undefined` ou nulos na serialização do objeto gerado pela API, não apenas escondidos no frontend.
- **Isolamento Tenant:** O `CLIENT_MASTER` só possui visão da sua própria Organization via `TenantHelper`.

## Review Focus
- **Fuga de Exposição Financeira (Agentes):** Um `AGENT` chamando `GET /contracts` recebe a array, mas a inspeção do Network (F12) listará a coluna `lastAmendmentValue`? Não pode, deve ser interceptado pelo Service/Serializer para chegar invisível. Teste unitário obrigatório nesse intercept.
- **Routing Protection:** O front deve ocultar colunas da tabela financeiras para Agentes e omitir o menu inteiro para Clientes padrão.

---

### Task 1: Prisma Schema & DB Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `Contract` model on Prisma.

- [ ] **Step 1: Adicionar modelo Contract**
Modificar o schema para incluir:
```prisma
enum ContractType {
  FIXED_COVERAGE
  HOURS_LIMIT
}

model Contract {
  id                 String       @id @default(uuid())
  organizationId     String
  organization       Organization @relation(fields: [organizationId], references: [id])
  type               ContractType @default(FIXED_COVERAGE)
  active             Boolean      @default(true)
  monthlyValue       Float?
  lastAmendmentValue Float?
  hoursLimit         Int?
  adjustmentDate     DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
}
```
*Lembrar de adicionar `contracts Contract[]` na model `Organization`.*

- [ ] **Step 2: Gerar DTOs básicos**
Criar `apps/api/src/contracts/dto/create-contract.dto.ts` (e update) validando propriedades (`IsNumber()`, `IsEnum()`) e gerando OpenAPI `@ApiProperty`.

- [ ] **Step 3: Compilar Prisma migration dev**
Run: `DATABASE_URL=... npx prisma migrate dev --name add_contracts_module`

### Task 2: Tenant Security & Backend Service (NestJS)

**Files:**
- Modify: `apps/api/src/core/security/tenant.helper.ts`
- Create: `apps/api/src/contracts/contracts.service.ts`
- Create: `apps/api/src/contracts/contracts.controller.ts`
- Create: `apps/api/src/contracts/contracts.module.ts`

**Interfaces:**
- Consumes: `TenantHelper.getContractWhere(user)`

- [ ] **Step 1: Extender TenantHelper**
Criar `TenantHelper.getContractWhere(user)`.
- `ADMIN`: Retorna `{}` 
- `CLIENT_MASTER`: Retorna `{ organizationId: user.organizationId }`
- `AGENT/AGENT_MASTER`: Retorna `{ active: true }` (Podem ler os contratos ativos).
- `CLIENT`: Fail Closed.

- [ ] **Step 2: Logic de Omissão e ContractsService**
Na listagem `findAll()`, mapear o array vindo do Prisma:
```typescript
const isAgent = [Role.AGENT, Role.AGENT_MASTER].includes(user.role);
return data.map(contract => {
  if (isAgent) {
     // Stripe out secret financial data
     const { monthlyValue, lastAmendmentValue, adjustmentDate, ...safeData } = contract;
     return safeData;
  }
  return contract;
});
```
(Cobrir as guards do Controller garantindo `@Roles(ADMIN, CLIENT_MASTER, AGENT, AGENT_MASTER)` no Get, e `ADMIN` para Post/Patch/Delete).

- [ ] **Step 3: Teste focado em Omissão**
`contracts.service.spec.ts`: Garantir que `user: AGENT` retorne um objeto SEM a propriedade de valores financeiros.

- [ ] **Step 4: Executar Test/Lint/Typecheck**
Integrar tudo e rodar pipeline unificada no backend.

### Task 3: Integração Frontend (Web View)

**Files:**
- Create: `apps/web/src/pages/ContractsPage.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: REST endpoint `/contracts`.

- [ ] **Step 1: Injetar no Sidebar**
Mostrar menu "Contratos" apenas para `['ADMIN', 'CLIENT_MASTER', 'AGENT_MASTER', 'AGENT']`.

- [ ] **Step 2: Renderizar a Tela ContractsPage**
Carregar lista via `useQuery`. 
Montar a tabela.
Condicional da tabela: `const showFinancial = user?.role === 'ADMIN' || user?.role === 'CLIENT_MASTER';` 
Se verdadeiro, renderiza as colunas de "Valor Mensal / Adendo" e "Reajuste".
Se o Role for Agente, essas colunas não podem nem sequer aparecer na array do HTML.
Aviso: Os Agentes visualizam ali somente pra saber que "A Empresa DM TECH possui Pacote de 40 Horas".

- [ ] **Step 3: Validar Localmente**
Run: `pnpm exec nx run web:build` para captar dead imports/types.

### Task 4: Commit e Fechamento

**Files:**
- Modificações englobadas no módulo global.

- [ ] **Step 1: Git flow**
Commit englobando: `feat(contracts): add financial and SLA contracts module masking accounting data from agents`