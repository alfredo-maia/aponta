# Novo ticket: usar a largura da tela com colunas responsivas

Identidade: DMTE-489, issue dmrepositorio/aponta#212, Tier 1, ciclo 2026-11-09/2026-11-22. Seguimento da DMTE-483 (#200, em produção). Bug pequeno de layout; Architect dispensado (WORKFLOW.md, Tier 1 com critérios na issue). Direção visual decidida pelo pedido do usuário ("deixar responsivo"), sem reordenar o DOM.

## Situação atual (renderizado no Chromium, API mockada, 1920/1440/1024/768/390px)
Sem rolagem horizontal em nenhuma largura; no celular o formulário vira uma coluna. Em 1920px o conteúdo ocupa 896px dos ~1630px úteis: o teto `max-w-4xl` do formulário e do catálogo não muda com a tela, e cliente/mesa/solicitante/prioridade ficam em 2 colunas acima de 768px.

## Situação desejada
Formulário e catálogo com teto `max-w-7xl` (80rem), campos de identificação em 1 coluna no celular, 2 a partir de `md` e 4 a partir de `xl`, e cartões do catálogo em 4 colunas a partir de `xl`. Ordem do DOM e foco inalterados.

## Acceptance criteria
- AC-01: o contêiner do formulário e o do catálogo usam o teto `max-w-7xl`, o mesmo para os dois.
- AC-02: o bloco com cliente, mesa, solicitante e prioridade usa 1 coluna no celular, 2 a partir de `md` e 4 a partir de `xl`.
- AC-03: a grade de cartões do catálogo passa a 4 colunas a partir de `xl`, mantendo 1, 2 e 3 nos tamanhos menores.

## Comportamento preservado (sem RED novo)
Carregamento do catálogo, formulário em branco, banner do serviço, Escape/voltar e payload da DMTE-483 e anteriores; o teste "DMTE-483 AC-04" (mesma largura nos dois contêineres) continua valendo.

## Testes
`apps/web/src/pages/CreateTicketPage.test.tsx`, seam: página renderizada com `api.get` mockado; jsdom não calcula layout, então os critérios comparam as classes responsivas do Tailwind. A validação visual real é feita com capturas do Chromium em 1920, 1440, 1024, 768 e 390px, anexadas no pai Multica (AC não automatizável; não substitui o aceite).

## Riscos e exclusões
Fora do escopo: campos, validações, payload, backend, ordem do DOM, colunas laterais, redesenho do catálogo. Largura de descrição e título passa a ~1200px em 1920px; o editor e os campos esticam sem quebra. Reverter é trocar as classes.
