# Apontamento do ticket: valor só com a permissão VIEW_TICKET_VALUES

Identidade: DMTE-464, Tier 2, ciclo 2026-10-26/2026-11-08. Pedido do Alfredo: na tela de apontamento do ticket, não mostrar o campo valor, exceto para Alfredo, Aline e Daniel. Decisões humanas (comentários na issue Multica): o controle não deve ser por ROLE e sim por permissão do grupo de permissões em Configurações; "Aprovado" ao plano proposto.

## Situação atual (código observado)
- `permission-catalog.ts` já tem `VIEW_TICKET_VALUES`; `GET /permission-groups/catalog` a entrega à tela de grupos. Só protege `GET :ticketId/worklog-audit`.
- `worklogs.service.ts` `maskValue` mascara `value`, `valueCents`, `costCents`, `bonusReason` e `valuationSnapshot` com `role === ADMIN`; `excessHourlyRateCents` do contrato também.
- `TicketWorklogs.tsx` usa `isAdmin = role === 'ADMIN'` para o campo Valor, tipo de valorização, coluna Valor e total.
- `PermissionsGuard` e `/auth/me` dão bypass ao ADMIN (`permissions: []`). O grupo padrão "Administrador" recebe todo o catálogo.

## Situação desejada
Só quem tem `VIEW_TICKET_VALUES` em algum grupo (direto ou pelo grupo técnico) vê valor, na API e na tela, sem bypass por role.

## Decisões
- Nova regra `canViewTicketValues(userId)` em `PermissionsService`: só olha as permissões efetivas, sem bypass de ADMIN.
- Backend: `maskValue` passa a usar essa regra; `excessHourlyRateCents` do contrato e `worklog-audit` também. Valor manual (`MANUAL`) exige ADMIN **e** a permissão. Bonificação segue exclusiva do ADMIN.
- `GET /auth/me` ganha `canViewTicketValues` (calculado igual, também para ADMIN). `isAdmin` e `permissions` não mudam.
- Tela: Valor, coluna, total, tipo "Valor manual" e a exibição financeira do detalhe usam `canViewTicketValues`; o resto do `isAdmin` fica.
- Migração: remove `VIEW_TICKET_VALUES` do grupo "Administrador" e cria o grupo "Valores de tickets" com essa chave e sem membros, se não existir. `DEFAULT_PERMISSION_GROUPS[ADMIN]` deixa de listar a chave. Quem entra no grupo é decisão do Alfredo, em Configurações; até lá ninguém vê valor.
- Sem nova chave no catálogo. Sem schema novo.

## Acceptance criteria
- AC-01: usuário sem `VIEW_TICKET_VALUES`, inclusive ADMIN, recebe `value`, `valueCents`, `costCents`, `bonusReason` e `valuationSnapshot` nulos em listagem e criação.
- AC-02: usuário com a permissão (grupo direto ou do grupo técnico), qualquer role, recebe os valores.
- AC-03: `MANUAL` é recusado para quem não é ADMIN ou não tem a permissão.
- AC-04: `/auth/me` devolve `canViewTicketValues` coerente com AC-01/AC-02, inclusive para ADMIN.
- AC-05: a tela só mostra campo Valor, coluna Valor e total quando `canViewTicketValues` é verdadeiro.
- AC-06: o grupo padrão ADMIN não inclui `VIEW_TICKET_VALUES` e a migração cria "Valores de tickets" sem membros e a remove de "Administrador".

## Testes
`worklogs.service.spec.ts`, `permissions.service.spec.ts`, `auth.controller.spec.ts`, `seed.spec.ts` (api, Jest) e `TicketWorklogs.test.tsx` (web, Vitest). Seam: `PermissionsService.canViewTicketValues` e o hook de `/auth/me`. TDD real, com RED por asserção.

## Riscos e exclusões
- Efeito imediato após deploy: ninguém vê valor até o Alfredo montar o grupo. Mitigação: aviso na entrega; a migração é revertível pela tela de grupos.
- RBAC e tenant: nenhuma rota nova; o mascaramento é no servidor. QA confere ADMIN sem permissão e agente com permissão.
- Fora de escopo: relatórios e telas de contratos com valor, mudança de role dos usuários, deploy.

## Ticket único
T1: backend + migração + tela + testes (AC-01..AC-06). Sem bloqueadores. Dispensa grill-with-docs/to-spec/to-tickets originais porque é ajuste de RBAC em funcionalidade existente com decisões humanas já registradas; ticket único como na entrega DMTE-456.
