# Valor de tickets: VIEW_TICKET_VALUES nos relatórios e pendências da DMTE-464

Identidade: DMTE-479, Tier 2, ciclo 2026-11-09/2026-11-22, issue GitHub #188. Pendências da DMTE-464 (PR #173). Decisão humana (comentário do Alfredo na issue Multica): "o acesso por perfil está descontinuado, segue a configuração do sistema mesmo". Interpretação registrada e publicada no pai: acesso pela permissão do grupo; a role fica só como recorte de dados.

## Situação atual (código observado em d15fbcc)
- `reports.service.ts` `getBilling`: guarda só por role (`ADMIN`/`CLIENT_MASTER`); soma `valueCents`, `value` e `amountCents` dos segmentos.
- `commercial-reports.service.ts` `getCommercial`: guarda só `Role.ADMIN`; devolve `valueCents`, `costCents`, `valuationSnapshot`. Sem recorte por organização.
- Os controllers só exigem `VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT`.
- `ReportsPage.tsx`: abas Faturamento (`ADMIN`/`CLIENT_MASTER`) e Resultado gerencial (`ADMIN`) por role.
- `TicketWorklogs.tsx`: o rascunho restaura `MANUAL`/`BONUS` e `manualValue` olhando `isAdmin`, e `hasDraftLoaded` conta `manualValue`.
- Migração `20261109120000_view_ticket_values_group` localiza o grupo por `name = 'Administrador'`.
- `PermissionsService.canViewTicketValues(userId)` já existe (DMTE-464), sem bypass de ADMIN. Nenhum grupo padrão de CLIENT_MASTER tem a chave.

## Decisões
- Os dois serviços chamam `PermissionsService.canViewTicketValues` e respondem 403 sem a permissão, para qualquer role. O guarda por role continua, como recorte de dados e para não ampliar acesso: o recorte por organização do CLIENT_MASTER (`TenantHelper`) e o relatório comercial só-ADMIN seguem; a permissão é exigida além do role, como a DMTE-464 fez com `worklog-audit`.
- Sem alterar grupos padrão nem criar migração de dados. Efeito após o deploy: CLIENT_MASTER e ADMIN só veem faturamento/resultado se o grupo deles tiver a chave; ajuste é do Alfredo em Configurações.
- Tela de Relatórios: aba Faturamento Base exige `canViewTicketValues` além do role atual; aba Resultado gerencial idem. A consulta de faturamento não dispara sem a permissão.
- Rascunho: o tipo efetivo `MANUAL` só vale com `canViewTicketValues`; sem ela vale `CONTRACT` (como a DMTE-463 fez para Garantia), sem `value` no envio. O aviso de rascunho não muda (esclarecido na implementação: o texto anterior falava em aviso, mas o defeito real é o envio bloqueado).
- Migração por nome: não editada (já aplicada; mudar o arquivo não altera bancos onde rodou).

## Acceptance criteria
- AC-01: `getBilling` recusa com `ForbiddenException` usuário sem `VIEW_TICKET_VALUES`, ADMIN e CLIENT_MASTER inclusive; com a permissão mantém o resultado e o recorte por organização atuais.
- AC-02: `getCommercial` recusa com `ForbiddenException` ADMIN sem `VIEW_TICKET_VALUES`; ADMIN com a permissão mantém o resultado atual; role diferente de ADMIN continua recusada.
- AC-03: na tela de Relatórios, sem `canViewTicketValues` as abas Faturamento Base e Resultado gerencial não aparecem e a consulta de faturamento não é feita; com a permissão e o role atual elas aparecem como hoje.
- AC-04: com rascunho `MANUAL` e `manualValue` e usuário ADMIN sem a permissão, o envio sai como `CONTRACT` sem `value`, em vez de ficar bloqueado por um erro de valor manual que a tela não mostra.

## Testes
`reports.billing.spec.ts`, `commercial-reports.service.spec.ts` (api, Jest); `ReportsPage.test.tsx`, `TicketWorklogs.test.tsx` (web, Vitest). Seam: `PermissionsService.canViewTicketValues` injetado nos dois serviços. TDD real, RED por asserção.

## Riscos e exclusões
- Efeito imediato após deploy: relatórios de valor somem para quem não está no grupo "Valores de tickets"; aviso na entrega.
- RBAC e tenant: nenhuma rota nova; QA confere ADMIN sem permissão, CLIENT_MASTER com e sem permissão e isolamento por organização.
- Fora de escopo: remover os guardas por role dos serviços (abriria o relatório comercial a todas as organizações), grupos padrão, migração de dados, outras telas de contrato com valor, deploy.

## Ticket único
T1: backend + tela + testes (AC-01..AC-04). Sem bloqueadores. Dispensa grill-with-docs/to-spec/to-tickets: ajuste de RBAC com decisão humana registrada, como DMTE-464.
