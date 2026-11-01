# SPEC — EzEntityGrid: arrastar linha para reordenar

- Entrega: DMTE-160 · GitHub alfredo-maia/aponta#60 · Tier 2 (Triagem DMTE-183, aprovada)
- Fase: Architect DMTE-184 · Data: 01/11/2026 · Base: `main` (inclui PR #108)
- Componente: `apps/web/src/components/ds/EzEntityGrid.tsx` (+ `.test.tsx`, `.stories.tsx`)

## 1. Objetivo e estado atual

Fechar o único gap restante do pedido #60: reordenar **linhas** por arrastar (`ag-row-drag` do AG Grid do Sankhya).

Hoje o grid reordena/redimensiona colunas via DnD nativo (`handleDragStart/Over/Drop`, `enableColumnReorder`) e tem navegação por teclado (`enableKeyboardNavigation`: ArrowUp/Down, Espaço). Não existe nenhuma lógica de arrastar linha (sem `onRowReorder`/`rowOrder`/`moveRow`), nem `getRowId` (o TanStack usa o índice como `row.id`).

## 2. Escopo e exclusões

Dentro: coluna de alça de arraste opt-in, reordenação por ponteiro e por teclado, anúncio para leitor de tela, callback de ordem, story e testes.

Fora (confirmado no pedido/briefing): cor, altura de linha e densidade; persistência/API da ordem (a tela dona de `data` persiste); arraste entre páginas; arraste de múltiplas linhas; arraste de linhas de grupo; qualquer mudança de motor.

## 3. Decisões

| # | Decisão | Fonte |
|---|---|---|
| D1 | **Opção (a): manter `@tanstack/react-table`.** Não migrar para AG Grid. | `docs/architecture/03-sankhya-ds-parity.md` (decisão deliberada de usar TanStack como engine + skin DS); 6 capacidades equivalentes já entregues sem trocar de motor; migrar por 1 recurso traria dependência pesada e possível licença Enterprise. Decisão vigente, não reaberta; o responsável do produto pode contestá-la antes do Developer iniciar. |
| D2 | Recurso **opt-in** (`enableRowReorder`, default `false`): nenhum consumidor atual (`OrganizationsPage`, `ServiceDesksPage`, `ContractViews`) muda. | Compatibilidade |
| D3 | Grid **controlado**: não muta `data`; emite `onRowReorder` e a tela reordena. | Padrão do componente (`columnOrder`/`onColumnOrderChange`) |
| D4 | Ponteiro: DnD nativo HTML5 (mesmo mecanismo do reorder de colunas). Sem nova dependência. | Precedente no próprio componente |
| D5 | Teclado: alça é `<button>`; Enter/Espaço pega, ↑/↓ move, Enter/Espaço solta, Esc cancela. Anúncios em região `aria-live="polite"`. **Não usar `aria-grabbed`/`aria-dropeffect`** (obsoletos desde WAI-ARIA 1.1, suporte inconsistente); usar `aria-pressed` na alça + live region. | Responde à pendência a11y da Triagem |
| D6 | Reordenar só com a visão = ordem dos dados: alça desabilitada (`aria-disabled`, com dica textual) se houver ordenação, filtro de coluna ou agrupamento ativos. Com paginação, reordena dentro da página atual (índices absolutos = `pageIndex*pageSize + i`). | Evita ordem ambígua |

## 4. Contrato de UI (proposta, novo)

```ts
enableRowReorder?: boolean;                       // default false
getRowId?: (row: T, index: number) => string;    // repassado ao useReactTable; default = índice
onRowReorder?: (e: {
  rowId: string; fromIndex: number; toIndex: number;  // índices absolutos em `data`
  orderedIds: string[];                               // ids após mover
}) => void;
```

- Coluna técnica `__rowDrag__`: primeira, não reordenável como coluna (tratar como `select`/`__rowNumber__` em `handleDragOver/Drop`), fora do configurador de colunas e das estatísticas.
- Alça com ícone existente do DS/lucide (ex.: `GripVertical`), `aria-label="Mover linha {n}"`, `cursor-grab`; linha arrastada com estilo reduzido e indicador de destino (linha/borda com tokens `brand-*` existentes). Sem novo token.
- Referência visual: pedido #60 / `ag-row-drag` do Sankhya; não há mockup aprovado — a story é o artefato de revisão visual. Aprovação visual extra, se desejada, é do usuário.

## 5. Autorização, dados, riscos

- RBAC/tenant: sem API, schema ou migração neste escopo; permissão de reordenar e persistência são da tela consumidora (não aplicável ao componente). Consumidor deve só passar `enableRowReorder` quando o perfil puder editar.
- Riscos: (R1) `row.id` por índice causa seleção/foco errados após reorder → exigir `getRowId` estável ao habilitar; (R2) `focusedRowIndex` deve seguir a linha movida; (R3) DnD nativo não funciona em touch → o teclado/botões são o caminho acessível, touch fica fora; (R4) jsdom não simula DnD real → testar via `fireEvent.dragStart/dragOver/drop`.

## 6. Critérios de aceite

- **AC-01** Com `enableRowReorder`, cada linha de dados exibe alça; sem a prop, nenhuma coluna/alça aparece e o comportamento atual é idêntico.
- **AC-02** Arrastar a linha A sobre a linha B e soltar chama `onRowReorder` uma vez com `rowId`, `fromIndex`, `toIndex` e `orderedIds` corretos; `data` do grid não é mutado.
- **AC-03** Soltar sobre si mesma ou fora de uma linha válida não chama o callback.
- **AC-04** Teclado: alça focada + Enter/Espaço grava "pegou"; ↑/↓ muda o destino (limites 0 e último sem estourar); Enter/Espaço confirma e dispara `onRowReorder`; Esc cancela sem callback.
- **AC-05** A live region anuncia pegar, nova posição ("posição X de N"), soltar e cancelar, em pt-BR.
- **AC-06** Com ordenação, filtro de coluna ou agrupamento ativos, a alça fica `aria-disabled`, com explicação textual, e não dispara callback; ao limpar, volta a funcionar.
- **AC-07** Com paginação, os índices do callback são absolutos (página 2 inclusa) e não há arraste para outra página.
- **AC-08** Linhas de grupo não são arrastáveis nem destino; `__rowDrag__` não é reordenável como coluna nem aparece no configurador.
- **AC-09** Após reordenar com `getRowId` estável, seleção e linha focada acompanham a mesma linha.
- **AC-10** Story com estado controlado demonstra ponteiro, teclado e estado desabilitado; `web:build-storybook` gera a entrada no `index.json`.

## 7. Matriz AC → verificação → evidência esperada

| AC | Verificação | Local | Evidência esperada |
|---|---|---|---|
| 01 | Teste de componente RTL (com/sem prop) | `EzEntityGrid.test.tsx` | Vitest verde |
| 02, 03 | RTL `fireEvent.dragStart/dragOver/drop` | idem | idem |
| 04, 05 | RTL `userEvent.keyboard` + `getByRole('status')`/live region | idem | idem |
| 06, 07 | RTL com `sorting`/filtro/`pageSize` | idem | idem |
| 08, 09 | RTL (grupo, configurador, seleção após rerender) | idem | idem |
| 10 | Story `ReordenarLinhas` (+ desabilitada) | `EzEntityGrid.stories.tsx` | `web:build-storybook` e contagem no `index.json` |

Build do Storybook não prova interação/a11y; só declarar a11y automatizada se houver runner com resultado observado. Comandos: confirmar com `pnpm exec nx show project web --json`; RED→GREEN por AC; lint/typecheck/testes de `web` antes da revisão; QA repete sem cache. Manifest da entrega: declarar `design_system` com reuso do EzEntityGrid + story nova.

## 8. Pendências

- Nenhuma bloqueante. D1 permanece sujeita a contestação do responsável (ver acima).
- Evidências, SHA e testes reais serão associados pelo Developer/QA; nada aqui foi executado.
