# Módulo de Base de Conhecimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular o Módulo de Base de Conhecimento (FAQ e Manuais), diferenciando rigidamente o conteúdo interno (Playbooks, Tutoriais de Suporte) do conteúdo liberado aos clientes (Autoatendimento). 
**Architecture:** Mapeamento em cima do model `Article` já existente no Prisma, consolidando o flag `isPublic`. Criação de endpoins separados ou unificados filtrados pelo TenantHelper/Role Guards.
**Tech Stack:** NestJS, Prisma, React, TDD UI.
**Spec:** `docs/superpowers/specs/2026-10-02-aponta-evolution-design.md`

## Global Constraints
- **Separação Obrigatória:** Sob nenhuma hipótese o `CLIENT` ou `CLIENT_MASTER` devem listar ou visualizar um artigo cujo `isPublic` seja falso. Essa trava é na fundação do backend (`findMany`).
- **Destruição Exclusiva:** O Agent pode escrever tutoriais, mas `DELETE /articles/:id` requer papel igual a `Role.ADMIN`. O Agent que deletar acidentalmente algo recebe falha de autorização 403.

## Review Focus
- **Spoofing de Leitura:** O que ocorre se um Client tentar ler o ID de um artigo privado no Endpoint GET via API REST pura (cURL)? A resposta deve ser `404 Not Found` (mascarado por segurança) ou 403.
- **Rompimento UI:** Clientes Padrão acessando a página `/knowledge` não podem ver botões com labels ocultas (e.g. "+ Conhecimento" fantasma no DOM). O código da renderização tem que suprimir as instâncias dependendo da flag Roles.

---

### Task 1: Ajuste do Prisma Model e DTOs OpenAPI

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/articles/articles.controller.ts` (ou controllers relacionados ao Knowledge)
- Create: `apps/api/src/articles/dto/article-query.dto.ts`

**Interfaces:**
- Produces: API Swagger para o Módulo de Base de Conhecimento (MCP export).

- [ ] **Step 1: Expandir o `Article`**
Adicionar campos `tags` ou hierarquia se necessário (O Model na real já possui `isPublic`). Adicionar apenas as anotações do OpenAPI `@ApiProperty` na base de DTOs e validação de schema.

- [ ] **Step 2: Endpoint DTO**
Anotar `@ApiProperty` no Create/Update Article DTO e query DTO garantindo validação forte (`whitelist: true`).

### Task 2: Blindagem no Endpoint do Backend

**Files:**
- Modify: `apps/api/src/articles/articles.service.ts`
- Modify: `apps/api/src/articles/articles.controller.ts`

**Interfaces:**
- Consumes: `RolesGuard` e `CurrentUser`.

- [ ] **Step 1: Interceptação no `findAll()`**
Se a regra de `user.role` cair em `CLIENT` ou `CLIENT_MASTER`, anexar forcado `where: { isPublic: true }`.
Se for da operação (`AGENT`, `AGENT_MASTER`, `ADMIN`), anexar `where: {}` (lêem tudo).

- [ ] **Step 2: Interceptação de Mutação**
Adicionar `@Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT)` em `Post` e `Patch`.
Adicionar estritamente `@Roles(Role.ADMIN)` em `Delete`.

- [ ] **Step 3: Teste RED para Falha de Deleção de Agente**
Adicionar spec em `articles.service.spec.ts` batendo com user = `AGENT` tentando excluir artigo, devendo estourar ForbiddenException.

### Task 3: Views Web - Switch de Base Pública

**Files:**
- Modify: `apps/web/src/pages/KnowledgePage.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: A listagem da API do Task 2.

- [ ] **Step 1: Ocultamento Tático**
No React, `const canManage = ['ADMIN', 'AGENT_MASTER', 'AGENT'].includes(user.role);`
`const canDelete = user.role === 'ADMIN';`
Seconder o Botão [+ Conhecimento] baseado no Manage. E o botão de Ícone Lixeira baseado no Delete.

- [ ] **Step 2: The "Base Pública" Toggle**
Quando a role for autorizada (Agent/Admin), na tabela ou no card de listagem exibir um Switch (ou Badge) visual indicando se `isPublic = true`. No Form do "Criar Artigo", a checkbox "Marcar como Base Pública" é condicional aos mesmos cargos autorizados. O cliente não o vê, para ele a página é só o grid/visualizador do autoatendimento (Tutorials/FAQ).

### Task 4: Commits de Conclusão Global
- [ ] **Step 1: Validações Core**
`pnpm exec nx run web:build`
`pnpm exec nx run api:test --testNamePattern="ArticlesService"`
- [ ] **Step 2: Encerramento Final**
Fechamento do Issue da Base de FAQ Pública, englobando a separação e proteção anti-leak de wiki interna.