# CI/CD: merge queue, CD aguarda CI, suporte merge_group

Identidade: DMTE-466, issue dmrepositorio/aponta#162, Tier 2, ciclo 2026-10-26/2026-11-08. Pedido direto do usuário (Alfredo): reduzir índice de conflitos entre múltiplas PRs trabalhadas em paralelo, reorganizar o CI, corrigir o CD para esperar o CI terminar (não rodar em paralelo), usando boas práticas de mercado e mantendo GitHub Actions sem sugerir outra ferramenta.

## Situação atual (código observado, antes desta entrega)
`ci.yml` e `deploy.yml` disparavam ambos em `push: branches: [main]`, rodando em paralelo — o CD podia implantar um commit que o CI ainda não tinha validado. O ruleset de proteção da `main` exigia um check `typecheck` que não existe em nenhum workflow, bloqueando todo merge permanentemente. O Merge Queue nativo do GitHub não pode ser habilitado em repositório de conta pessoal (`alfredo-maia/aponta`, HTTP 422 confirmado via API). `scripts/aponta_delivery.py` e `scripts/publicar_qa.py` tinham o literal `alfredo-maia/aponta` hardcoded em validações e na publicação do status "Independent QA".

## Situação desejada
CD dispara só depois do CI terminar com sucesso, fixado no SHA exato validado (não "o que estiver na main agora"). CI cancela runs obsoletos da mesma PR/branch (`concurrency` + `cancel-in-progress`). Merge Queue nativo do GitHub habilitado e funcional, incluindo os scripts de validação de entrega funcionando corretamente dentro do evento `merge_group` (que não carrega `pull_request` no payload).

## Decisões
- Repositório transferido de `alfredo-maia/aponta` para a organização `dmrepositorio` (autorizado explicitamente pelo usuário) — único jeito de habilitar Merge Queue nativo no GitHub.
- Check fantasma `typecheck` removido do ruleset da `main` antes de qualquer outra mudança (causa-raiz que bloquearia qualquer PR).
- `deploy.yml`: trigger trocado de `push` para `workflow_run` (`workflows: ["CI"], types: [completed]`), com `if: github.event.workflow_run.conclusion == 'success'` e o step de deploy fixado em `github.event.workflow_run.head_sha`.
- `ci.yml`: adicionado `concurrency: { group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}, cancel-in-progress: true }` e trigger `merge_group`.
- `delivery.yml`: adicionado trigger `merge_group` (antes só `pull_request`), pois é check obrigatório no ruleset e precisa rodar dentro da fila também.
- `scripts/aponta_delivery.py`: nova função pura `resolve_pr_from_event(event, fetch_pr)` — evento `pull_request` usa `event['pull_request']` diretamente; evento `merge_group` extrai o número da PR do `head_ref` (formato `refs/heads/gh-readonly-queue/<base>/pr-<N>-<sha>`) e busca a PR real via `fetch_pr` injetado (chamada real: `gh api repos/<repo>/pulls/<N>`). Substituído hardcode `alfredo-maia/aponta` por `CANONICAL_REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'dmrepositorio/aponta')` em toda validação de identidade/regex.
- `scripts/publicar_qa.py`: mesmo padrão `CANONICAL_REPOSITORY` na URL de publicação do status.
- `.delivery/registry.json` e `.delivery/deliveries/*.json`, `AGENTS.md`, `docs/agents/issue-tracker.md`, `docs/delivery/WORKFLOW.md`: `alfredo-maia/aponta` → `dmrepositorio/aponta`. Specs históricos em `docs/delivery/specs/` e `project_items.json` **não foram tocados** — preservam o registro real do que aconteceu sob a URL antiga.

## Acceptance criteria
- AC-01: `resolve_pr_from_event` com um evento `pull_request` retorna o body/base/head exatamente como estavam no payload original (comportamento preexistente preservado).
- AC-02: `resolve_pr_from_event` com um evento `merge_group` e um `fetch_pr` mockado extrai corretamente o número da PR do `head_ref` e retorna os dados da PR buscada, sem lançar `KeyError`.
- AC-03: `resolve_pr_from_event` com um `head_ref` de merge_group que não casa com o formato esperado retorna uma falha tratável (não lança exceção não capturada).
- AC-04 (operacional, fora do CI): uma PR real passando pela Merge Queue do GitHub completa o check `Aponta delivery contract` sem erro.
- AC-05 (operacional, fora do CI): um push de teste no CI não dispara o CD antes do CI reportar sucesso; o CD realizado usa o SHA exato do `workflow_run`.

## Testes
`scripts/test_aponta_delivery.py`, TDD real: RED contra a versão anterior do módulo (sem `resolve_pr_from_event`, 4 testes falhando — evidência em `.delivery/evidence/DMTE-466/red.json`), GREEN com a implementação (55/55 testes passam — evidência em `.delivery/evidence/DMTE-466/green.json`). Comando: `GITHUB_REPOSITORY=dmrepositorio/aponta python3 -m unittest discover -s scripts -p test_aponta_delivery.py -v`.

## Riscos e exclusões
AC-04 e AC-05 só são verificáveis com uma execução real do GitHub Actions (fila de merge, workflow_run) — fora do alcance de um teste unitário local; ficam como validação operacional pendente na primeira PR real que passar pela fila após esta entrega. Fora do escopo: resolver o conflito de produto entre as PRs #158/#159 (tratado como item separado), destravar as PRs hoje bloqueadas (#150/#151/#158/#159/#160, item separado), mudança de provedor de CI/CD (mantido GitHub Actions por decisão explícita do usuário).

## Ticket único
T1: workflows (`ci.yml`, `deploy.yml`, `delivery.yml`) + `resolve_pr_from_event` em `scripts/aponta_delivery.py` + fix de hardcode em `scripts/publicar_qa.py` + testes (AC-01..AC-03). Sem bloqueadores. Refs #162.
