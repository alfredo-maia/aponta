# Kanban de tickets: coluna recolhida com a altura das colunas abertas

Identidade: DMTE-496, issue dmrepositorio/aponta#224, Tier 1, ciclo 2026-11-09/2026-11-22. Ajuste pequeno de layout com critérios na issue; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). A referência visual é o TiFlux, nas duas capturas anexadas ao pai Multica DMTE-496.

## Situação atual
Observado em `apps/web/src/components/tickets/TicketKanban.tsx` na `main`: o quadro (`KANBAN_BOARD_CLASS`) usa `items-start`; a coluna expandida tem `min-h-[500px]`; `CollapsedColumn` tem `w-12 shrink-0 ... p-2`, sem altura mínima nem estiramento. Na captura do Aponta, "Aberto", "Em Andamento" e "Escalonado" recolhidos têm alturas diferentes entre si, todas menores que as colunas abertas ao lado.

## Situação desejada
Como no TiFlux, a tira recolhida tem a altura das colunas expandidas do quadro. Proposta: `min-h-[500px]` (mesmo piso da coluna expandida) e `self-stretch` (acompanha a coluna mais alta, que cresce com os cards) em `CollapsedColumn`. Sem mudar largura, rótulo, contador ou o chevron.

## Acceptance criteria
- AC-01: a coluna recolhida tem `min-h-[500px]` e `self-stretch`, no agrupamento por estágio e no por status.
- AC-02: expandir e recolher, contador, rótulo vertical e arrastar-e-soltar continuam como estão (testes existentes de recolher/expandir seguem verdes).

## Testes
`apps/web/src/components/tickets/TicketKanban.test.tsx`, seam: quadro renderizado com `api.get` mockado, recolhendo uma coluna pelo botão `collapse-column-*`; jsdom não calcula layout, então o teste confere as classes da tira recolhida (o pai do botão `expand-column`) nos dois modos. A validação visual real é de captura do Chromium, anexada no pai Multica; não substitui o aceite do usuário.

## Riscos e exclusões
Fora do escopo: largura da tira (48px, no TiFlux ~56px), sentido do texto vertical (no TiFlux lê de cima para baixo, no Aponta de baixo para cima), agrupamentos por responsável e prioridade (não recolhem), backend. Observado sem alterar: o botão de expandir só tem `title`, sem `aria-label` (Web Interface Guidelines). Reverter é remover as duas classes.
