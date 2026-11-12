# Abertura de ticket: seletor Mesa alinhado aos demais campos

Identidade: DMTE-500, issue dmrepositorio/aponta#229, Tier 1, ciclo 2026-11-09/2026-11-22. Seguimento da DMTE-490 (#223), que passou os seletores para o `EzSelect`. Bug pequeno de layout; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). Pedido do usuário no pai Multica DMTE-500: "O seletor Mesa está para baixo dos demais."

## Situação atual
Em `/tickets/new`, a linha Cliente / Mesa / Solicitante / Prioridade tem controles em alturas diferentes. Medido em Chromium (main 42ef297), com `EzSearch` e `EzComboBox` na mesma grade de 4 colunas: topo do controle em 54px (Cliente e Solicitante), 61px (Prioridade) e 64px (Mesa).

Causa (medida): o rótulo do `EzSelect` é montado com `cn('font-medium leading-none select-none', 'text-[14px]', ...)`. O `twMerge` trata `text-[14px]` como conflitante com `leading-*` quando vem depois e remove o `leading-none`; o rótulo passa a ter line-height de 21px (14px no `EzSearch`/`EzTextInput`, onde `leading-none` vem depois). Na Mesa, o `*` obrigatório fica num `span` fora do rótulo, com o line-height (24px) e o tamanho de fonte (16px) do corpo, e soma mais 2px à linha depois de corrigido o `leading-none`.

## Situação desejada
A linha do rótulo do `EzSelect` mede 14px com ou sem `*`, como a do `EzSearch`, e os quatro campos começam no mesmo topo.

## Acceptance criteria
- AC-01: o rótulo do `EzSelect` mantém `leading-none` nas variantes `default`, `classic` e `compact`.
- AC-02: a linha do rótulo (rótulo e `*`) do `EzSelect` tem `leading-none` e o `*` tem o tamanho de fonte do rótulo, então um seletor obrigatório não fica mais alto que um sem `*`.

## Testes
`apps/web/src/components/ds/EzSelect.test.tsx`, seam: o componente renderizado (jsdom não calcula layout, então os testes conferem as classes finais, que é onde o defeito está). Validação visual (não é AC do coletor): medição em Chromium (script descartável, fora do repositório) de que Cliente, Mesa, Solicitante e Prioridade têm o mesmo topo de controle, registrada no pai Multica; não substitui o aceite do usuário.

## Riscos e exclusões
Fora do escopo: `EzSearch`, `EzTextInput`, campos, validações, payload, backend, outras telas. Efeito colateral aceito: todo `EzSelect` com rótulo passa a ter a linha do rótulo de 14px (era 21px), alinhando-se ao `EzSearch`/`EzTextInput`; telas que misturavam esses campos ficam mais alinhadas, não menos. Reverter é remover as duas classes.
