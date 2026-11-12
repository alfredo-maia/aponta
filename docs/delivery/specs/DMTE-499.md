# Busca avançada: página sem teto de largura

Identidade: DMTE-499, issue dmrepositorio/aponta#227, Tier 1, ciclo 2026-11-09/2026-11-22. Seguimento da DMTE-493 (#216, PR #217, integrado na `main`). Bug pequeno de layout; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). A direção visual é decisão do usuário (DMTE-499, 2026-11-12: a busca avançada deve ficar "igual à tela de tickets", sem o limite de largura que corta a seção).

## Situação atual
Na `main`, `TicketAdvancedSearchPage.tsx` tem `max-w-5xl` (1024px) no contêiner da página. Em monitores largos o formulário fica numa coluna estreita ao lado do menu, como no print do pedido. A tela de novo ticket (DMTE-493) e a de Relatórios não têm teto.

## Situação desejada
O contêiner da página sem classe `max-w-*`, como a tela de novo ticket. A grade responsiva dos campos (1 / 2 / 3 colunas), a ordem do DOM e os botões ficam como estão.

## Acceptance criteria
- AC-01: o contêiner de `TicketAdvancedSearchPage` não tem teto de largura (`max-w-*`).

## Comportamento preservado
Todos os campos e filtros, a navegação para `/?...` ao buscar, o botão de limpar e o recolhimento das seções. Nenhum teste existente afirma o teto `max-w-5xl` (verificado com `grep max-w` nos testes da página).

## Testes
`apps/web/src/pages/TicketAdvancedSearchPage.test.tsx`, seam: página renderizada com `api.get` mockado; jsdom não calcula layout, então o teste confere as classes: nenhum ancestral do título "Busca avançada" dentro da página tem `max-w-*`. O comportamento preservado (campos, grade 1 / 2 / 3, ordem do DOM, busca e limpeza) não é um critério à parte: não há RED possível para o que não muda, e os testes existentes da página (campos D4, busca, limpeza e seções recolhíveis) continuam verdes sem alteração. Não há captura de tela nesta entrega (a demanda não as pediu e a tela exige login com backend); a conferência visual e o aceite são do usuário.

## Riscos e exclusões
Fora do escopo: campos, filtros, navegação, backend, redesenho do formulário e outras telas. Em 2560px a grade de 3 colunas deixa os campos largos; a decisão de aceitar isso é do usuário. Reverter é recolocar `max-w-5xl`.
