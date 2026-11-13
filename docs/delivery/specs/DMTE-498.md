# Kanban de tickets: seletor de mesa com a cor do botão Novo Ticket

Identidade: DMTE-498, issue dmrepositorio/aponta#246, Tier 1, ciclo 2026-11-09/2026-11-22. Ajuste visual numa tela só; Architect dispensado com grill-with-docs → to-spec → to-tickets (não é funcionalidade nova nem refatoração grande, WORKFLOW.md); critérios na issue e nesta SPEC. Pedido do alfredo-maia, 2026-11-12: "Trocar a cor do botão de mesa, para ficar com a mesma coloração do botão de abrir ticket do menu". Esclarecimento dele no card (2026-11-13): é o seletor "Mesa: Todas / Mesa: <nome>" do Kanban, só ele, com `brand-500`, `text-gray-70` e hover `brand-700`, sem mudar o `EzSelect` nem os outros seletores.

## Situação atual
`mesaSelector` em `apps/web/src/components/tickets/TicketKanban.tsx` é um `EzSelect` padrão: caixa `bg-white` com borda `gray-200`, texto `gray-900`, chevron `gray-500`. O botão "Novo Ticket" (`Sidebar.tsx`, `EzButton` primary) usa `bg-brand-500`, `border-brand-500`, `text-gray-70` e hover `bg-brand-700` / `border-brand-700`.

## Situação desejada
A caixa do seletor de mesa do Kanban usa os mesmos tokens do "Novo Ticket": fundo e borda `brand-500`, texto e chevron `gray-70`, hover com fundo e borda `brand-700`. O anel de foco do `EzSelect` (`brand-600`) e a lista suspensa (branca) não mudam.

Proposta de implementação (não é escopo fechado): classes de variante arbitrária no `div` que envolve o `EzSelect` em `mesaSelector`, apontando para a caixa do controle e para o botão `combobox` (o `EzSelect` não expõe `className` para o controle interno). Nenhum arquivo de `components/ds` muda.

## Acceptance criteria
- AC-01: a caixa do seletor de mesa do Kanban tem fundo e borda `brand-500`; o texto e o chevron têm `gray-70`.
- AC-02: no hover, a caixa do seletor de mesa do Kanban passa a fundo e borda `brand-700`.
- AC-03: o `EzSelect` não muda: `components/ds/EzSelect.tsx` fica intacto e um `EzSelect` fora do seletor de mesa continua com caixa `bg-white`.

## Comportamento preservado
Escolha de mesa, `aria-label="Mesa"`, `data-testid="kanban-mesa-select"`, abertura da lista, Esc, clique fora, foco visível (anel `brand-600`), lista suspensa branca, ordem da barra (Mesa, responsáveis, Ordenar, Configurações).

## Testes
`apps/web/src/components/tickets/TicketKanban.test.tsx`, bloco novo "DMTE-498: seletor de mesa com a cor do Novo Ticket". Seam: o Kanban renderizado com `api.get` mockado; a caixa do controle é o pai do `combobox` "Mesa"; asserções sobre as classes de token. jsdom não calcula CSS: as classes são conferidas por teste e a cor renderizada por captura do Chromium no pai Multica (sem substituir o aceite visual do usuário). Também rodar `scripts/check_tickets_palette.py`, `scripts/check_tickets_proportion.py` e `scripts/check_native_select.py`.

## Direção de UI (Impeccable, modo Operate; Web Design Guidelines)
Impeccable, modo Operate: a cor de acento fica para ação primária; aqui é pedido explícito do usuário para unificar com o "Novo Ticket", então o ajuste é só de tokens, sem forma nova. Web Design Guidelines (regras recuperadas em 2026-11-13): foco visível preservado (anel do `EzSelect`), hover presente, `aria-label` do controle mantido. Sem `PRODUCT.md`/`DESIGN.md` no repositório e o launcher `impeccable context` sem permissão de execução (`Permission denied`); a direção vem de `docs/architecture/03-sankhya-ds-parity.md` e dos tokens de `apps/web/src/styles.css`.

## Riscos e exclusões
- Contraste: `gray-70` (#ffffff) sobre `brand-500` (#1a9171) dá cerca de 3,9:1, abaixo de 4,5:1 para texto de 14px. É a mesma combinação do "Novo Ticket" e foi pedida assim; fica registrado para o aceite visual do usuário. Não proposto: escurecer o fundo.
- O `EzSelect` não tem gancho de estilo para o controle interno; a solução por seletor descendente depende da estrutura atual (caixa que contém o botão `combobox`). Se o usuário quiser a mesma cor em outros seletores, o caminho é uma variante no DS: decisão dele, fora desta entrega.
- Fora do escopo: `EzSelect`, outros seletores, Ordenar/Configurações, Lista, Busca avançada. Reverter é remover as classes do `mesaSelector`.
