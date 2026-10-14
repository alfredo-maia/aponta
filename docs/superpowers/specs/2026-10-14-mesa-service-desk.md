# SPEC — Mesa de serviço (evoluir `ServiceDesk`)

**Date:** 2026-10-14
**Issue:** DMTE-46
**Tier:** 3
**Repo model:** evoluir `ServiceDesk` existente. Não criar segundo agregado. Não migrar `Ticket.serviceDeskId`.

## 1. Decisões

1. **Mesa é conceito próprio**, igual no TiFlux. Não mapear em Recurso nem em Departamento — esses nomes só confundem a UI.
2. **Nome na UI:** **Mesa** (sidebar, Configurações, tickets, docs visíveis). Rotas e API continuam `/service-desks` (sem breaking change de URL).
3. **Estágios por mesa** ficam na DMTE-41, depois desta. A aba Estágio existe na tela, desabilitada com badge "Em breve".
4. **Fora do corte:** automações de entrada/saída; relação contrato ↔ mesa (não confirmada no TiFlux).
5. **Não abrir issue no GitHub** a menos que peçam de novo.

## 2. Estado atual (Aponta)

Já existe e permanece:

| Capacidade | Onde |
|---|---|
| Nome da mesa | `ServiceDesk.name` |
| Ticket na mesa | `Ticket.serviceDeskId` |
| Clientes N:N | `ServiceDesk.organizations` |
| Agentes N:N | `ServiceDesk.agents` (`_AgentServiceDesks`) |
| Grupos de atendentes N:N | `ServiceDesk.agentGroups` |
| Catálogo | `ServiceCatalogItem.defaultServiceDeskId` |
| SLA hours por prioridade | `sla*ResponseHours` / `sla*ResolveHours` |
| Expediente e feriados | `BusinessHour`, `Holiday` |

Mistura de rótulos hoje:

- Sidebar ADMIN: **Recursos** → `/service-desks`
- Configurações ADMIN: **Departamentos**
- Grid de tickets: **Mesa / Fila**
- Docs internas: Mesa de Serviço

A tela admin atual (`ServiceDesksPage`) é lista + formulário com nome, membros, SLA e expediente — sem abas do TiFlux.

## 3. Gap vs mesa do TiFlux (estudo DMTE-41)

### 3.1 Informações básicas

| Campo TiFlux | Campo Prisma | Default (mesas existentes) |
|---|---|---|
| Nome | `name` (já tem) | — |
| Nome de exibição | `displayName String?` | `null` → UI usa `name` |
| Descrição | `description String?` | `null` |
| Ativa | `active Boolean` | `true` |
| Recebendo novos tickets | `acceptingNewTickets Boolean` | `true` |
| Uso interno | `internalUse Boolean` | `false` |
| Apontamentos com valorização | `worklogsWithValuation Boolean` | `true` (módulo de valorização já existe) |
| Meta de SLA | já coberto pelos `sla*Hours` | — |

Mesa `active=false` ou `acceptingNewTickets=false` não entra no seletor de abertura e o POST `/tickets` rejeita com 400.

Mesa `internalUse=true` some do seletor para `CLIENT` / `CLIENT_MASTER`.

### 3.2 Parâmetros da mesa

| Flag | Default | Efeito |
|---|---|---|
| `allowCrossDeskInteraction` | `false` | `true`: AGENT/AGENT_MASTER vê tickets de mesas às quais não está vinculado (ADMIN já vê tudo). `false`: mantém `TenantHelper` atual. |
| `allowCancelTicket` | `true` | `false`: `POST /tickets/:id/cancel` retorna 403. Cancelamento = `CLOSED` + audit `cancelled` (sem novo enum). |
| `catalogRequiredOnOpen` | `false` | `true`: criar ticket sem `catalogItemId` retorna 400. |
| `slaControlEnabled` | `true` | `false`: prazos de SLA nascem nulos; UI esconde editor de SLA. |
| `allowAddSlaHours` | `false` | `true`: habilita `POST /tickets/:id/sla/add-hours`. Sem a flag, 403. |
| `allowPauseResumeSla` | `true` | `false`: transições que pausam/retomam SLA (`ON_HOLD`, `PENDING_CUSTOMER` e volta) retornam 403. |
| `reviewFlowEnabled` | `false` | Liga a aba/regras de revisão. Sem fluxo de revisão executável nesta issue além de persistir config. |
| `evaluationEnabled` | `false` | Quando `false`, CSAT do ticket desta mesa não é solicitado. |
| `openByAgentsOnly` | `false` | `true`: `CLIENT`/`CLIENT_MASTER` não criam ticket nesta mesa (400). |

### 3.3 Campos obrigatórios do solicitante

Booleanos na mesa. Na abertura, o backend valida o `User` solicitante (e anexos do ticket):

| Flag | Validação |
|---|---|
| `requireRequesterName` | `User.name` não vazio |
| `requireRequesterEmail` | `User.email` não vazio |
| `requireRequesterPhone` | `User.phone` não vazio |
| `requireRequesterExtension` | `User.extension` não vazio (`extension String?` novo em `User`) |
| `requireResourceGroup` | `CreateTicketDto.resourceGroup` obrigatório (texto livre; módulo Recursos ainda não existe — não inventar entidade) |
| `requireAttachments` | ticket precisa nascer com pelo menos 1 anexo **ou** a API de create rejeita e o front só submete após upload |

Defaults: todos `false` (não quebrar abertura atual).

### 3.4 Prioridades por mesa

Tabela `ServiceDeskPriority`:

```
id, serviceDeskId, ticketPriority TicketPriority, label String, icon String?, sortOrder Int, enabled Boolean
@@unique([serviceDeskId, ticketPriority])
```

No create da mesa, seed das 4 prioridades globais (Crítica/Alta/Média/Baixa) habilitadas, `sortOrder` 0..3.

Na abertura, `priority` precisa estar `enabled` nesta mesa; senão 400.

Ícone é string livre (nome lucide ou url curta) para paridade visual; v1 aceita `critical|high|medium|low`.

### 3.5 Grupos de atendentes — restrições

Já existe N:N `AgentGroup` ↔ `ServiceDesk`. Acrescentar na mesa:

- `listedGroupsOnly Boolean` default `false` — se `true`, só membros dos grupos vinculados (ou `agents` diretos) manipulam o ticket (status, assign, worklog, comentário interno).
- `unlistedCanCreateTicket Boolean` default `true` — se `listedGroupsOnly` e o agente não está na lista, ainda pode **criar** ticket quando esta flag é `true`.

A aba reusa o vínculo `agentGroups` + `agents` já existente.

### 3.6 Status padrão

- `defaultOpenStatus TicketStatus` default `OPEN`
- `defaultClosedStatus TicketStatus` default `CLOSED`

`TicketsService.create` usa `defaultOpenStatus` no lugar de `OPEN` hardcoded.
Cancelamento / fechamento administrativo usa `defaultClosedStatus`.

### 3.7 Reabertura

Hoje: só ADMIN, `CLOSED → OPEN`.

Por mesa:

- `allowReopenUnbilled Boolean` default `true`
- `allowReopenBilled Boolean` default `false`
- `reopenDefaultReplyUnbilled String?`
- `reopenDefaultReplyBilled String?`

Ticket **faturado** = existe `Worklog` com `billable=true` ou `valuationType=MANUAL` com `value > 0`. Caso contrário, não faturado.

Reabertura continua restrita a ADMIN (não ampliar RBAC). A mesa só **nega** quando a flag correspondente é `false`. Se houver `reopenDefaultReply*`, o service cria um `Comment` (`isInternal: false`) com esse texto.

### 3.8 Seções do ticket

Tabela `ServiceDeskTicketSection`:

```
id, serviceDeskId, key ServiceDeskSectionKey, enabled Boolean, sortOrder Int
@@unique([serviceDeskId, key])
```

Enum `ServiceDeskSectionKey`:

`GENERAL_INFO, CATEGORY, SERVICE_TYPE, WORKLOGS, COMMUNICATION, APPOINTMENTS, VALUATION, E_SIGNATURE, GITHUB, HISTORY, TROUBLESHOOTING`

Seed no create: habilitadas as que o Aponta já renderiza (`GENERAL_INFO, CATEGORY, WORKLOGS, COMMUNICATION, APPOINTMENTS, VALUATION, HISTORY`). As demais nascem `enabled=false` (módulos inexistentes — checkbox visível, desabilitado na UI com "Em breve").

A tela de detalhe do ticket **esconde** blocos cuja seção está `enabled=false` nesta mesa.

### 3.9 Revisão (config only)

Campos na mesa (sem motor de revisão nesta issue):

- `reviewType String?` (`INTERNAL` \| `CLIENT` \| `BOTH`)
- `reviewDeadlineDays Int?`
- `reviewNotifyEmail Boolean` default `false`
- `reviewReminder Boolean` default `false`
- `reviewReapplyReopen Boolean` default `false`

Persistir e exibir na aba. Execução do fluxo = follow-up.

## 4. API / RBAC

Mutations de mesa: `@Roles(Role.ADMIN)` — create/update/delete e PATCH das flags/listas. `AGENT_MASTER` continua podendo `PUT /service-desks/:id/business-hours`.

Leituras:

- `GET /service-desks` — autenticado. CLIENT só vê mesas `active` + vinculadas à sua org + `internalUse=false` + `acceptingNewTickets=true`.
- `GET /service-desks/:id` — inclui prioridades, seções, grupos, agentes, orgs, SLA.

DTOs: todo campo novo com `@ApiProperty` / `@ApiPropertyOptional`. `ValidationPipe` já está `whitelist + forbidNonWhitelisted` — o PATCH da mesa precisa listar **todos** os campos novos.

Endpoints de ticket novos (intent-driven, sem PATCH genérico extra):

- `POST /tickets/:id/cancel` — ADMIN/AGENT/AGENT_MASTER; respeita `allowCancelTicket`.
- `POST /tickets/:id/sla/add-hours` — body `{ hours: number }`; respeita `allowAddSlaHours`.

`TicketsService.create` passa a receber `CurrentUserPayload` (não só `requesterId`) para aplicar `openByAgentsOnly`, catálogo obrigatório, mesa inativa, campos do solicitante e prioridade habilitada.

## 5. UI

Tela `/service-desks` (ADMIN):

1. Lista (EzEntityGrid) com colunas: Nome, Nome de exibição, Ativa, Recebendo, Clientes, Agentes.
2. Formulário/detalhe com `EzTabs` (paridade TiFlux):

   Informações básicas · Parâmetros · Campos obrigatórios · Prioridades · Clientes · Grupos de atendentes · Estágio (disabled) · Status · Reabertura · Seções do ticket · Revisão · Expediente (já existe, vira aba)

Sidebar: label **Mesa** no lugar de Recursos (mesmo `to`, mesma posição Issue #48). Allow-list de roles troca `'Recursos'` por `'Mesa'`.

Configurações: **Mesa** no lugar de Departamentos.

Tickets: coluna **Mesa** (sem "/ Fila"). Formulário de abertura: label **Mesa**; filtra mesas inativas/internas; se `catalogRequiredOnOpen`, catálogo vira required; prioridade só lista as `enabled`.

## 6. Aceite

- SPEC neste arquivo + plan em `docs/superpowers/plans/2026-10-14-mesa-service-desk.md`.
- Tickets atuais continuam no `serviceDeskId` que já têm.
- Mesas existentes continuam ativas, recebendo tickets, com as 4 prioridades e seções padrão após a migration (backfill).
- API recusa abertura que viole parâmetros da mesa (testes unitários RED→GREEN).
- UI unificada como **Mesa**, com abas; Estágio não implementa fluxo.
- Testes unitários (api + web) e E2E Playwright (ADMIN abre tela Mesa, cria mesa, vê abas, sidebar diz Mesa).
- Review independente (suite completa + E2E) **antes** do commit.
- Sem commit se o reviewer tiver finding Important ou maior.

## 7. Fora

- Motor de estágios / transições (DMTE-41).
- Automações.
- Contrato ↔ mesa.
- Módulo Recursos (ativos). Flag `requireResourceGroup` usa texto livre.
- Executar o fluxo de revisão (só persiste config).
