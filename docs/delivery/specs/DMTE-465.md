# + Novo Ticket: abrir chamado em branco falha

Identidade: DMTE-465, issue dmrepositorio/aponta#182, Tier 1, ciclo 2026-11-09/2026-11-22. Bug pequeno confirmado por leitura de código; Architect dispensado (WORKFLOW.md, bug Tier 1 com critérios confirmados).

## Situação atual (código observado)
`CreateTicketPage` cria, para "Meu problema não está catalogado", um item sintético com `id: 'custom'` e `defaultServiceDeskId: ''`. A mutation aplicava o override de catálogo também a ele: enviava `catalogItemId: 'custom'` e trocava `serviceDeskId`/`priority` por `''`/`MEDIUM`. `CreateTicketDto` exige UUID nos dois campos, então a API responde 400 e a tela mostra "Falha ao criar o chamado".

## Situação desejada
O fluxo em branco envia a mesa e a prioridade escolhidas no formulário e nenhum `catalogItemId`.

## Acceptance criteria
- AC-01: ao abrir um chamado em branco pelo catálogo, o payload de `POST /tickets` não contém `catalogItemId` e leva a mesa e a prioridade do formulário.
- AC-02: itens reais do catálogo continuam enviando `catalogItemId`, mesa e prioridade do item.

## Testes
`apps/web/src/pages/CreateTicketPage.test.tsx`, seam: payload enviado a `api.post('/tickets')`. Comando: `npx vitest run src/pages/CreateTicketPage.test.tsx` em `apps/web`.

## Riscos e exclusões
Fora do escopo: o web nunca envia `resourceGroup`, exigido por mesas com `requireResourceGroup` (hipótese não reproduzida), e qualquer mudança na API.
