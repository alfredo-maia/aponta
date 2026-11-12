# Novo ticket: formulário e catálogo sem teto de largura

Identidade: DMTE-493, issue dmrepositorio/aponta#216, Tier 1, ciclo 2026-11-09/2026-11-22. Seguimento da DMTE-489 (#212, PR #213, integrado na `main`). Bug pequeno de layout; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). A direção visual é decisão do usuário (DMTE-483, 2026-11-11: "podemos tirar o teto"; 2026-11-12: abrir PR novo para o ajuste).

## Situação atual
Na `main`, `CreateTicketPage.tsx` tem `max-w-7xl` (1280px) nos três contêineres: carregamento do catálogo, catálogo e formulário. A tela de Relatórios não tem teto (contêiner `space-y-6`) e ocupa a área útil ao lado do menu em qualquer monitor.

## Situação desejada
Os três contêineres sem classe `max-w-*`, como Relatórios. As colunas responsivas da DMTE-489 (identificação em 1 / 2 / 4, catálogo em 1 / 2 / 3 / 4, ações com quebra de linha, aviso da mesa em linha inteira) e a ordem do DOM ficam como estão.

## Acceptance criteria
- AC-01: o contêiner de carregamento, o do catálogo e o do formulário de `CreateTicketPage` não têm teto de largura (`max-w-*`).
- AC-02: o catálogo e o formulário continuam com a mesma largura entre si e com as colunas responsivas da DMTE-489 (identificação em 1, 2 e 4 colunas; catálogo em 1, 2, 3 e 4).

## Comportamento preservado
Carregamento do catálogo, formulário em branco, banner do serviço, Escape/voltar e payload. O teste "DMTE-489 AC-01" (teto `max-w-7xl`) deixa de valer por decisão do usuário e é substituído pelo teste do AC-01 desta entrega. O auxiliar `maxWidth` do teste "DMTE-483 AC-04" passa a aceitar a ausência do contêiner com teto.

## Testes
`apps/web/src/pages/CreateTicketPage.test.tsx`, seam: página renderizada com `api.get` mockado; jsdom não calcula layout, então o teste confere as classes. AC-02 é coberto pelos testes existentes "DMTE-483 AC-04", "DMTE-489 AC-02" e "DMTE-489 AC-03"; os dois últimos não mudam e o primeiro só muda no auxiliar `maxWidth` (ver "Comportamento preservado"). Sem teto, "DMTE-483 AC-04" compara `undefined` com `undefined`: só falha se um dos dois contêineres voltar a ter `max-w-*`; a garantia de ausência do teto é do AC-01. A validação visual real é feita com capturas do Chromium em 1920, 1440, 1024, 768 e 390px, sem rolagem horizontal, anexadas no pai Multica; não substitui o aceite do usuário.

## Riscos e exclusões
Fora do escopo: campos, validações, payload, backend, ordem do DOM, redesenho do catálogo e outras telas. Em 2560px o título e a descrição ocupam ~2200px (visto nas capturas da DMTE-489); a decisão de aceitar isso é do usuário. Reverter é recolocar `max-w-7xl`.
