# Novo ticket: layout desproporcional e formulário aparece antes do catálogo

Identidade: DMTE-483, issue dmrepositorio/aponta#200, Tier 1, ciclo 2026-11-09/2026-11-22. Bug pequeno confirmado por leitura de código; Architect dispensado (WORKFLOW.md, bug Tier 1 com critérios confirmados na issue).

## Situação atual (código observado, `main` 3abe1f0)
- `CreateTicketPage` usa `max-w-lg` (32rem) no ramo do formulário e `max-w-4xl` (56rem) no ramo do catálogo; o `<main>` do `AppLayout` não centraliza. Em tela larga o formulário vira uma faixa estreita à esquerda.
- `useQuery('/catalog')` não tem tratamento de carregamento: `catalog` vale `[]` até a resposta, a condição do catálogo exige `catalog.length > 0` e o formulário renderiza primeiro; quando a consulta resolve, o catálogo o substitui.

## Situação desejada
Formulário e catálogo na mesma largura máxima; enquanto o catálogo carrega, a página mostra só um estado de carregamento do DS; catálogo vazio ou com erro continua abrindo o formulário em branco.

## Acceptance criteria
- AC-01: com a consulta de catálogo pendente, a página mostra um estado de carregamento e não renderiza o formulário.
- AC-04: o contêiner do formulário usa a mesma largura máxima do contêiner do catálogo.

## Comportamento preservado (sem RED novo)
Com a consulta de catálogo falhando ou vazia, a página abre o formulário em branco (teste "DMTE-483 AC-02: …" e testes existentes); com catálogo preenchido, mostra o catálogo, escolher um item mostra o formulário com o banner do serviço, e Escape ou voltar retorna ao catálogo (testes existentes). Esses comportamentos passam antes e depois, então não são critérios com RED. O RED real é AC-01 e AC-04.

## Testes
`apps/web/src/pages/CreateTicketPage.test.tsx`, seam: a página renderizada com `api.get` mockado. Comando: `pnpm --filter @aponta/web exec vitest run src/pages/CreateTicketPage.test.tsx` (ajustar ao script real do app). jsdom não calcula layout; AC-04 compara a classe de largura máxima dos dois contêineres.

## Riscos e exclusões
Fora do escopo: campos, validações e payload do formulário, backend, regras de catálogo e mesa, redesenho do catálogo. A largura final é decisão visual a validar em desktop e celular; sem captura de tela comparável nesta rodada se o ambiente não rodar o app.
