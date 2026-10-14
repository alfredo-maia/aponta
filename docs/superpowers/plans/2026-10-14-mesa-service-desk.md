# Plan — Mesa de serviço (DMTE-46)

Fonte: `docs/superpowers/specs/2026-10-14-mesa-service-desk.md`

## Task 1 — Schema + migration + backfill

- Estender `ServiceDesk` com flags/campos da SPEC.
- `User.extension String?`
- `ServiceDeskPriority`, `ServiceDeskTicketSection` + enums.
- Migration SQL com DEFAULTS que não quebram mesas atuais.
- Backfill: 4 prioridades + seções padrão por mesa existente.
- `Ticket.resourceGroup String?`

## Task 2 — API mesa (TDD)

- RED: `service-desks.service.spec.ts` e DTO specs (`import 'reflect-metadata'`).
- Create/update persistem flags, seed de prioridades/seções no create.
- `findAll` filtra para CLIENT (ativa, org, não interna, recebendo).
- `@ApiProperty` em todo campo. ADMIN-only mutations.

## Task 3 — Regras na abertura/ciclo do ticket (TDD)

- `TicketsService.create(dto, user)`: mesa inativa / não recebendo / interna / só atendentes / catálogo obrigatório / prioridade desabilitada / campos do solicitante / `resourceGroup`.
- Cancel, add-hours, pause/resume, reopen billed vs unbilled.
- `listedGroupsOnly` + `unlistedCanCreateTicket`.
- `allowCrossDeskInteraction` no `TenantHelper`.

## Task 4 — UI admin Mesa

- Sidebar/Settings/Tickets: rótulo **Mesa**.
- `ServiceDesksPage` com `EzTabs` da SPEC.
- Atualizar testes (`Recursos` → `Mesa`, `Departamentos` → `Mesa`).
- Sem `() => {}` vazios; `() => undefined`.

## Task 5 — Ticket UI

- Seletor de mesa filtra; catálogo/prioridade/seções respeitam a mesa.
- Testes de `TicketForm` / detalhe.

## Task 6 — E2E

- ADMIN: login, menu Mesa, criar mesa, ver abas, persistir flag.

## Task 7 — Review independente

- Subagente sem contexto do implementer.
- `nx run-many -t test,lint,typecheck --projects=api,web` + `nx run web-e2e:e2e`.
- Finding Important+ → fix loop. Commit só depois.
