# Lista de tickets: controles na lista vazia e revisão das colunas

Identidade: DMTE-502, issue dmrepositorio/aponta#230, Tier 2 (escolha do planejador: toca a API e dado pessoal do solicitante), ciclo 2026-11-09/2026-11-22. Origem: pedido do usuário na DMTE-502, triagem no pai. Os prints 2 e 3 do pedido são de outro sistema e servem só de referência de comportamento. Triagem enxuta e SPEC enxuta: é uma correção mais colunas com dado que já existe, então não houve grill-with-docs nem to-tickets (decisão registrada no pai; um ticket só, um PR).

## Problem Statement

Na tela Tickets, aba Lista, um filtro que não devolve chamados mostra só "Nenhum chamado encontrado". Os controles "Agrupar por" e "Exibir colunas" somem, e quem filtrou não consegue trocar o agrupamento nem as colunas antes de ajustar o filtro. Além disso, o menu "Exibir colunas" não oferece alguns campos do solicitante e do chamado que a operação usa.

## Situação atual (código observado, `main` em `42ef297`)

- `apps/web/src/components/tickets/TicketList.tsx`: com `tickets.length === 0` o componente retorna `EzEmptyCard` antes de montar a barra com "Agrupar por" e "Exibir colunas".
- A Lista tem 14 colunas. Faltam e-mail, telefone e ramal do solicitante e grupo de recursos.
- `TICKET_LIST_INCLUDE` (`apps/api/src/tickets/tickets.service.ts`) já devolve `requester.email`, mas não `phone` nem `extension` (existem em `User`). `Ticket.resourceGroup` é gravado na abertura e já vem na listagem, mas não está no tipo `Ticket` do web.
- A configuração de colunas é guardada por usuário em `useUserScreenConfig('tickets-list')`; os padrões entram antes do salvo, então coluna nova começa oculta mesmo para quem já tem configuração salva.

## Solution

1. A barra de controles passa a ser montada também com a lista vazia; o estado vazio aparece no lugar da tabela.
2. Quatro colunas novas, ocultas por padrão: E-mail do solicitante, Telefone do solicitante, Ramal do solicitante e Grupo de recursos.
3. A API devolve `phone` e `extension` do solicitante só para perfis de equipe (ADMIN, AGENT_MASTER, AGENT). Para CLIENT e CLIENT_MASTER os dois campos não saem na resposta, e a tela não oferece essas duas colunas.

## User Stories

1. Como atendente, quero que "Agrupar por" e "Exibir colunas" continuem na tela quando o filtro não acha chamados, para preparar a visão antes de afrouxar o filtro.
2. Como atendente, quero mostrar e-mail, telefone e ramal do solicitante na lista, para ligar ou escrever sem abrir o chamado.
3. Como atendente, quero mostrar o grupo de recursos na lista, para separar os chamados por ele.
4. Como cliente, quero continuar sem ver telefone e ramal de outras pessoas da minha organização.

## Implementation Decisions

- Só a Lista muda. O Kanban e a Busca avançada ficam como estão.
- Estados de carregamento e de erro continuam sem os controles (o pedido não os cita).
- As quatro colunas são `defaultVisible: false`, na ordem: depois de "Solicitante" (e-mail, telefone, ramal) e depois de "Mesa de serviço" (grupo de recursos). Valor ausente aparece como "—", como as demais.
- "Agrupar por" não ganha opções novas.
- UI: o menu atual de "Exibir colunas" (lista de caixas de marcação) só ganha itens. Busca no menu e seções "Selecionadas/Padrões" ficam fora desta entrega. O menu é DS/Operate: `impeccable` e `web-design-guidelines` foram lidas no planejamento; a revisão das guidelines é feita sobre o diff na implementação.
- Contrato da API: `GET /tickets` mantém o formato; `requester` ganha `phone` e `extension` (string ou null) só para perfis de equipe. A lista de status e o resto da resposta não mudam. Sem endpoint novo, sem migração, sem feature flag (não há efeito externo; reverter é tirar as colunas e os dois campos do `select`).
- RBAC e tenant: o escopo por organização (`TenantHelper.getTicketWhere`) não muda; o corte por perfil dos dois campos novos acontece no servidor, não na tela. A tela também esconde as duas colunas para CLIENT/CLIENT_MASTER para não exibir coluna sempre vazia.

## Acceptance criteria

- AC-01: com `tickets: []`, `TicketList` mostra "Agrupar por", "Exibir colunas" e a mensagem "Nenhum chamado encontrado", e não mostra a tabela.
- AC-02: com `tickets: []`, abrir "Exibir colunas" lista todas as colunas, e marcar ou desmarcar uma persiste na configuração `tickets-list` e vale quando a lista volta a ter chamados.
- AC-03: nos estados de carregamento e de erro a lista continua sem os controles.
- AC-04: "Exibir colunas" oferece E-mail do solicitante, Telefone do solicitante, Ramal do solicitante e Grupo de recursos, desmarcadas por padrão; marcadas, a tabela mostra o valor do chamado ou "—" quando ausente. As sete colunas padrão atuais continuam marcadas.
- AC-05: para ADMIN, AGENT_MASTER e AGENT, a listagem devolve `requester.phone` e `requester.extension`.
- AC-06: para CLIENT e CLIENT_MASTER, a listagem não devolve `phone` nem `extension` do solicitante, e a tela não oferece as colunas de telefone e ramal.
- AC-07: o isolamento por organização e os filtros da listagem ficam como estão (os testes atuais de `findAll` continuam verdes).

## Testing Decisions

Teste comportamento visível, não implementação. Seams, em ordem de preferência:

1. Web, componente: `apps/web/src/components/tickets/TicketList.test.tsx` (Vitest + Testing Library), seam existente `renderList`, para AC-01 a AC-04 e a parte da tela de AC-06. O papel vem do `authStore`.
2. API: `apps/api/src/tickets/tickets.service.spec.ts`, bloco `findAll` (Jest, Prisma mockado), para AC-05, AC-06 e AC-07.

Aceite visual do menu com as novas colunas é do usuário; teste não o substitui.

## Matriz AC → verificação esperada

| AC | Verificação |
|---|---|
| AC-01 a AC-03 | `TicketList.test.tsx` |
| AC-04 | `TicketList.test.tsx` |
| AC-05, AC-06 | `tickets.service.spec.ts` (resposta) e `TicketList.test.tsx` (colunas) |
| AC-07 | `tickets.service.spec.ts`, suíte atual de `findAll` |

## Out of Scope

- Última resposta e Duração: precisam de definição de negócio (resposta pública ou também interna; fechamento menos abertura ou soma de apontamentos). Ficam para outra entrega, se o usuário quiser.
- Vencimento do estágio, Item/Área/Catálogo de serviços, Criado por, Nome do recurso, Categoria e Tipo de Atendimento: não há campo no `Ticket` (o item do catálogo só vale na abertura e não é gravado). Categoria e Tipo de Atendimento do chamado têm SPEC própria (DMTE-106), cuja implementação está só na branch `origin/agent/aponta-developer/97c4b2a26dd5` e não na `main`: `docs/superpowers/specs/2026-11-01-ticket-category-service-type.md`. Quando essa entrega entrar na `main`, as duas colunas entram na lista a partir dela. Os campos "Erro em qual rotina no sankhya?" etc. do pedido seriam campos personalizados por categoria, que nenhuma SPEC cobre.
- Busca e seções no menu de colunas, novas opções de "Agrupar por", Kanban e Busca avançada.
- Mudança de RBAC além do corte dos dois campos, e qualquer endpoint novo.

## Further Notes

- Riscos: (a) telefone e ramal são dado pessoal; o corte por perfil no servidor é o que protege CLIENT_MASTER, que lê chamados da organização inteira. (b) `Ticket.resourceGroup` é texto livre digitado na abertura; a coluna mostra o que foi digitado. (c) Um filtro vazio hoje some com os controles em todas as telas que usam `TicketList`; a correção vale para todas, e o teste de AC-01 cobre o componente.
- Ordem: um ticket, um PR (WIP 1). Sem termo novo no `GLOSSARY.md`, sem ADR.
- Pendências humanas (não bloqueiam esta entrega): se Última resposta e Duração entram numa próxima, e com qual definição; se o menu ganha busca e seções.
