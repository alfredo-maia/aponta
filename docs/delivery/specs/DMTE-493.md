# Novo ticket: formulário e catálogo sem teto de largura

Identidade: DMTE-493, issue dmrepositorio/aponta#216, Tier 1, ciclo 2026-11-09/2026-11-22. Seguimento da DMTE-489 (#212, PR #213, integrado na `main` com o teto `max-w-7xl`). Bug pequeno de layout; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). Direção visual decidida pelo usuário: "podemos tirar o teto" (DMTE-483, 2026-11-11) e pedido de PR novo para o ajuste (2026-11-12). Referência: a tela de Relatórios, que usa só `space-y-6`, sem `max-w-*`.

## Situação atual (código na `main`)
`apps/web/src/pages/CreateTicketPage.tsx` tem `max-w-7xl` (1280px) nos três contêineres: carregamento do catálogo, catálogo e formulário. Em tela larga o conteúdo fica alinhado à esquerda com a área à direita vazia.

## Situação desejada
Os três contêineres ocupam a área útil ao lado do menu, sem classe `max-w-*`, como Relatórios. As colunas responsivas da DMTE-489 (1 / 2 / 4 nos campos de identificação, 1 / 2 / 3 / 4 nos cartões do catálogo) e a ordem do DOM ficam como estão.

## Acceptance criteria
- AC-01: os três contêineres de `CreateTicketPage` (carregamento, catálogo e formulário) não têm classe `max-w-*`.
- AC-02: o catálogo e o formulário continuam com a mesma largura entre si (teste da DMTE-483 AC-04) e com as colunas 1 / 2 / 4 e 1 / 2 / 3 / 4 da DMTE-489.

## Comportamento preservado (sem RED novo)
Os testes "DMTE-483 AC-04", "DMTE-489 AC-02" e "DMTE-489 AC-03" já cobrem o AC-02 e continuam verdes. O teste "DMTE-483 AC-04" só passa a tolerar contêiner sem `max-w-*` (o auxiliar que lia a classe falharia com `null`); a asserção, mesma largura nos dois, não muda. O teste "DMTE-489 AC-01", que exigia `max-w-7xl`, é substituído pelo AC-01 desta entrega (decisão do usuário supera o teto).

## Testes
`apps/web/src/pages/CreateTicketPage.test.tsx`, seam: página renderizada com `api.get` mockado; jsdom não calcula layout, então o critério compara as classes do Tailwind nos três estados da página.
- AC-01 → "DMTE-493 AC-01: carregamento, catálogo e formulário sem teto de largura, como Relatórios" (teste novo, com RED).
- AC-02 → "DMTE-483 AC-04", "DMTE-489 AC-02" e "DMTE-489 AC-03" (existentes, sem RED novo).

Validação visual, que é o AC-03 da issue #216 e não entra no manifesto por não ser automatizável: capturas do Chromium em 1920, 1440, 1024, 768 e 390px sem rolagem horizontal, anexadas no pai Multica. Não substitui o aceite.

## Riscos e exclusões
Fora do escopo: campos, validações, payload, backend, ordem do DOM, redesenho do catálogo, outras telas. Em 1920px, título e descrição esticam até ~1630px, linhas longas no editor; é a decisão do usuário. Reverter é devolver `max-w-7xl`.
