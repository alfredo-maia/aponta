# Kanban de tickets: Ordenar e Configurações com Esc, clique fora e visual do seletor de mesa

Identidade: DMTE-497, issue dmrepositorio/aponta#226, Tier 1, ciclo 2026-11-09/2026-11-22. Melhoria pequena de interação e visual numa tela só; Architect dispensado com o grill-with-docs → to-spec → to-tickets (não é funcionalidade nova nem refatoração grande, WORKFLOW.md); critérios na issue e nesta SPEC. Pedido do alfredo-maia, 2026-11-12: "o botão ordenar e configurações da tela de tickets, eles para ficar com o mesmo layout e controles como o de voltar no esc, sumir ao clicar noutra seção do botão de seleção de mesa".

## Situação atual
No Kanban (`apps/web/src/components/tickets/TicketKanban.tsx`), o seletor de mesa é um `EzSelect`: fecha com Esc e com `mousedown` fora, devolve o foco ao controle e tem `aria-expanded`. `sortMenu` e `configMenu` são `<button>` mais `<div absolute>` controlados por `isSortMenuOpen` e `isConfigMenuOpen`: sem Esc, sem clique fora, sem ARIA, sem foco visível, e os dois podem ficar abertos ao mesmo tempo.

## Situação desejada
- Esc com o menu aberto fecha, devolve o foco ao botão e não aciona outra camada de Esc. Usa `useEscapeLayer` (camada `overlay`).
- `mousedown` fora do botão e do painel fecha. Clique dentro (inclusive na lista do "Agrupar por") não fecha.
- Um menu aberto por vez, e abrir um fecha o outro.
- Gatilho com `aria-expanded` e `aria-controls`, ícone com `aria-hidden`, foco visível (`focus-visible`, anel `brand-600` como o `EzSelect`).
- Visual de gatilho e painel alinhado ao `EzSelect` dentro dos tokens da aba Tickets (decisão de projeto, DMTE-427: `rounded-control`, `h-[var(--control-height-md)]`, `shadow-popover`; `check_tickets_proportion.py` reprova `rounded-[Npx]`): gatilho com ícone, rótulo em 14px e `ChevronDown` como o trigger do `EzSelect`, borda `gray-200` com `hover:gray-300` (mais `hover:bg-gray-90` que já existia), painel em `top-full mt-1 z-30` com a mesma borda e sombra da lista do seletor.

Proposta de implementação (não é escopo fechado): extrair um componente local `KanbanToolbarMenu` (gatilho + painel + Esc + clique fora) usado por Ordenar e Configurações, com um único estado `openMenu: 'sort' | 'config' | null` no Kanban.

## Acceptance criteria
- AC-01: com Ordenar aberto, Esc fecha o painel e o foco volta ao botão Ordenar.
- AC-02: com Configurações aberto, Esc fecha o painel e o foco volta ao botão Configurações.
- AC-03: `mousedown` fora de cada menu o fecha; clique dentro do painel (inclusive escolher uma opção do "Agrupar por") não o fecha. Clicar no seletor de mesa também fecha o menu aberto.
- AC-04: abrir Configurações com Ordenar aberto fecha Ordenar, e o inverso: nunca dois painéis abertos.
- AC-05: com a lista do "Agrupar por" aberta dentro de Configurações, o primeiro Esc fecha só a lista e o segundo fecha o painel.
- AC-06: os gatilhos expõem `aria-expanded` (true/false) e `aria-controls` do painel aberto; têm foco visível e o visual descrito em "Situação desejada".

## Comportamento preservado
Ordenação (campo, asc/desc, "Limpar ordenação"), agrupamento, "Exibir campos" e sua persistência, ordem da barra (Mesa, responsáveis, Ordenar, Configurações; teste "AC-04" existente), seletor de mesa e demais telas.

## Testes
`apps/web/src/components/tickets/TicketKanban.test.tsx`, bloco novo "DMTE-497: menus Ordenar e Configurações como o seletor de mesa", ao lado do bloco "avatares, Ordenar e Configurações (D6/T8)". Seam: o Kanban renderizado com `api.get` mockado, `fireEvent.keyDown(document, { key: 'Escape' })`, `fireEvent.mouseDown` fora e dentro, asserções por papel e `aria-expanded`. jsdom não calcula layout nem desenha o foco: as classes do AC-06 são conferidas por teste e o visual por capturas do Chromium (Kanban com Ordenar e Configurações abertos, 1440 e 390px) anexadas no pai Multica; capturas não substituem o aceite visual do usuário. Também rodar `scripts/check_tickets_proportion.py`, `scripts/check_tickets_palette.py` e `scripts/check_native_select.py`.

## Direção de UI (Impeccable, modo Operate; Web Design Guidelines)
Consistência e padrões conhecidos acima de expressão: o gatilho passa a parecer o controle vizinho (mesma altura, borda, hover e anel de foco). As regras de interação vêm de `EzSelect`. Web Design Guidelines (regras recuperadas em 2026-11-12) apontam no código atual: foco visível ausente nos dois botões (`outline`/`focus-visible`), ícones decorativos sem `aria-hidden`. Sem `PRODUCT.md`/`DESIGN.md` no repositório (o `impeccable context` não rodou: launcher sem permissão de execução); a direção vem de `docs/architecture/03-sankhya-ds-parity.md`.

## Riscos e exclusões
- O raio do gatilho fica em `rounded-control` (10px), não em 12px como o trigger padrão do `EzSelect`, porque o gate da aba Tickets reprova `rounded-[Npx]` e o `EzSelect` não tem variante com o token. Se o usuário quiser raio idêntico, é mudança no DS e fica fora desta entrega: decisão dele no aceite visual.
- Esc: o `EzSelect` aberto já para a propagação; a ordem do AC-05 depende disso e é coberta por teste.
- Em 390px o painel de Ordenar (`left-0`, 256px) passa da borda direita da tela e é cortado; o posicionamento é o de antes desta entrega e não foi alterado. A Lista (`TicketList.tsx`, "Exibir colunas") tem o mesmo padrão antigo de menu, sem Esc nem clique fora. Os dois ficam como pendência para o usuário decidir.
- Fora do escopo: lógica de ordenação/agrupamento, persistência, seletor de mesa, Lista, Busca avançada, outras telas. Reverter é restaurar `sortMenu`/`configMenu`.
