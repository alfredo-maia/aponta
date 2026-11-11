# Kanban de Tickets responsivo

Identidade: DMTE-458, issue dmrepositorio/aponta#183, Tier 1, ciclo 2026-11-09/2026-11-22. Bug reportado pelo usuário em 09/11/2026.

## Situação

Código observado: `apps/web/src/components/tickets/TicketKanban.tsx` usa `w-[290px] shrink-0` em todas as colunas, nos 4 modos do quadro (estágios, status, agrupamento e carregamento). Com 8 colunas de status o quadro passa da tela e a última coluna fica cortada.

## Decisão

Constantes `KANBAN_BOARD_CLASS` e `KANBAN_COLUMN_CLASS` compartilhadas pelos 4 modos. Celular: colunas de 80vw (máximo 320px), rolagem horizontal com snap. Tablet (`sm`): 260px com rolagem. Notebook (`lg`+): colunas dividem a largura (`flex-1`, mínimo 220px). Sem componente novo do DS; usa os tokens Tailwind já existentes.

## Acceptance criteria

- AC-01: o quadro é um contêiner de rolagem horizontal com snap, e as colunas não têm largura fixa de 290px.
- AC-02: em `lg` as colunas dividem a largura disponível (`lg:flex-1`) e nas telas menores alinham por snap (`snap-start`).

## Testes

`apps/web/src/components/tickets/TicketKanban.test.tsx` (vitest, jsdom). O jsdom não calcula layout; o teste confere as classes responsivas. A conferência visual em 390px, tablet e notebook é do QA.
