# Dashboard: Todos os Tickets e Meus Tickets abrem tela em branco

Identidade: DMTE-460, issue dmrepositorio/aponta#186, Tier 1, bug pequeno com critério confirmado na issue Multica. Architect dispensado: correção de uma linha de rota, sem decisão de desenho.

## Situação atual (código observado)
`DashboardPage.tsx` aponta os cards do resumo para `/tickets`, `/tickets?mine=true`, `?unassigned=true`, `?status=IN_PROGRESS`, `?paused=true` e `?overdue=true`. `App.tsx` só registra a lista de tickets em `/`; `/tickets` não casa com nenhuma rota e renderiza vazio. `TicketsPage` já lê os filtros por `useSearchParams` e `parseFiltersFromSearchParams`.

## Situação desejada
`/tickets` abre a mesma lista que `/`, com os filtros da query.

## Acceptance criteria
- AC-01: `/tickets` renderiza a lista de tickets (heading "Tickets") em vez de tela em branco.
- AC-02: `/tickets?mine=true` renderiza a lista de tickets.

## Testes
`apps/web/src/App.test.tsx`, `it.each` de DMTE-460 (seam: `<App />` com a URL da rota). Comando: `pnpm exec nx test web --testFile=App.test.tsx`.

## Riscos e exclusões
Risco baixo: só adiciona uma rota. Fora do escopo: o comportamento de cada filtro, que já vem de `ticketFilterParams.ts`, e qualquer mudança visual.
