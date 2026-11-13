# CD (Produção): avisar todos os cards do intervalo publicado, não só o da ponta da main

Identidade: DMTE-510, issue dmrepositorio/aponta#253, Tier 2, pai Multica `01a1d745-8afe-751b-a90c-dd7a55c43815`. Decisão do usuário (Alfredo) em 13/11/2026, estendendo a DMTE-506 (`docs/delivery/specs/DMTE-506.md`).

## Situação atual (observada em 13/11/2026)

- O job `resolve` de `.github/workflows/deploy.yml` publica sempre a ponta da `main` (`outputs.sha`). Quando o commit que disparou o run não é a ponta e o CI da ponta ainda não passou, o run termina sem publicar e sem avisar.
- Três PRs entraram pela fila em sequência (#233 → `44415732`, #234 → `c6f3d514`, #232 → `7ae71108`, entre 22:23 e 22:24 UTC). Os CDs dos dois primeiros saíram sem publicar. O CD de `7ae71108` (run 43519593425) publicou os três, mas o job `notify` só comentou na DMTE-497: `scripts/avisar_card.py` chama `github(sha)` e `delivery_of(prs)` uma vez, para o commit publicado. DMTE-499 e DMTE-502 ficaram sem aviso, e o líder, por contrato, não agenda reserva quando o projeto tem o aviso.
- `production_version()` já lê `https://dm.aponta.cloud/api/version` (`{"commit": "<sha40>"}`).

## Decisões

- `resolve` ganha o output `previous_sha`: um passo, antes de qualquer deploy, lê o commit em produção com `curl` em `https://dm.aponta.cloud/api/version` (`--max-time 10`) e só aceita valor com 40 hex minúsculos; qualquer falha deixa o output vazio e nunca falha o job. O `concurrency: deploy-production` garante que nenhum outro deploy esteja em andamento quando o passo roda. Build, `staging` e `production` não mudam.
- O job `notify` recebe `PREVIOUS_SHA: ${{ needs.resolve.outputs.previous_sha }}`. Nenhuma outra permissão ou secret muda; `MULTICA_TOKEN` continua lido só pelo `notify`.
- `scripts/avisar_card.py` resolve o intervalo com `gh api repos/${GITHUB_REPOSITORY}/compare/<previous>...<sha>?per_page=100` (fronteira injetável, como `github_pulls`). Usa o intervalo só quando `status == "ahead"` e a lista de commits veio completa (`total_commits <= len(commits)`). Caso contrário (sem `previous_sha`, igual ao publicado, `behind`/`diverged` por rollback, erro da API, lista truncada) o intervalo é só o commit publicado, exatamente como hoje, e o motivo vai para o log.
- Para cada commit do intervalo, `github_pulls(commit)` e `delivery_of(prs)` como hoje. Commit sem PR, sem `Aponta-Delivery` ou com mais de uma entrega distinta é ignorado com uma linha de log. Falha ao consultar um commit também o ignora, sem derrubar os outros. A consulta ao commit publicado que falha mantém o comportamento atual (log e saída 0).
- Deduplicação por entrega (`DMTE-N`): vale o commit mais novo do intervalo que resolveu para ela (squash: o único; merge commit: o commit de merge) e o PR dele. Resolve-se o pai de cada entrega com `parent_of()`; entrega sem manifest nem registro é ignorada com log.
- Um comentário por card, com a mesma menção ao `dev_ultra_lider` e o corpo de hoje: resultado, `- Commit:` (commit da própria entrega), PR, run e versão em produção. Duas adições, só quando valem:
  - `- Publicado no commit: \`<ponta>\`` quando o commit da entrega não é a ponta publicada;
  - `- Publicado junto com: DMTE-A (PR #x), DMTE-B (PR #y)` quando o deploy publicou mais de uma entrega (as outras, sem repetir a do próprio card, na ordem do commit mais novo de cada entrega no intervalo).
  Com uma única entrega no intervalo o corpo é byte a byte o de hoje. O veredito da versão em produção compara com o commit publicado (a ponta).
- Falha de `staging` ou `production` usa o mesmo resolvedor e comenta em todos os cards do intervalo, com o job que falhou e o link do run.
- A sonda de produção roda uma vez por run, não por card. Falha ao comentar em um card é registrada (token redigido) e não impede os demais; saída sempre 0 e `continue-on-error` mantido.

## Acceptance criteria

- AC-01: com N PRs mesclados em sequência e um único deploy da ponta, cada um dos N cards recebe o comentário do workflow, com menção, em até 2 minutos do fim do job.
- AC-02: com um único PR entre o commit anterior e o publicado, o comportamento é idêntico ao de hoje (um comentário, mesmo corpo).
- AC-03: falha de `staging` ou `production` gera o comentário de falha em todos os cards do intervalo.
- AC-04: `previous_sha` vazio, igual ao publicado ou não ancestral → aviso só do commit publicado, com o motivo no log do job; o CD não falha.
- AC-05: commit do intervalo sem PR/`Aponta-Delivery` não gera comentário nem falha o job.
- AC-06: testes unitários cobrem AC-01 a AC-05 sem rede; `python3 -m pytest scripts/test_avisar_card.py` passa.
- AC-07: `WORKFLOW.md` e as referências de `development-delivery` descrevem o aviso por intervalo.

## Testes

Seam: `scripts/avisar_card.py` com três fronteiras injetáveis (`github` para os PRs de um commit, `compare` para o intervalo, `http`), no padrão de `test_avisar_card.py`. Sem rede.

- AC-01: intervalo com três commits e três entregas: três POSTs, cada um para o pai certo, com a menção, o commit da própria entrega, `Publicado no commit` nos que não são a ponta e `Publicado junto com` com as outras duas.
- AC-02: um commit no intervalo, e o caso sem `PREVIOUS_SHA`: um POST com o mesmo corpo de hoje (comparado com `build_body(...)` sem as linhas novas).
- AC-03: staging com falha e produção com falha: um comentário de falha por card, sem sondar produção.
- AC-04: `PREVIOUS_SHA` vazio, igual ao publicado, `behind`/`diverged`, erro do compare e lista truncada: só o commit publicado, motivo no log, saída 0.
- AC-05: commit sem PR, PR sem linha, duas entregas no mesmo commit e entrega sem manifest dentro do intervalo: sem comentário para ele, os demais seguem; saída 0.
- Mesma entrega em dois commits do intervalo: um comentário só. Erro ao comentar em um card não impede os outros e o token não aparece no log.
- Workflow (leitura de texto; não há runner local do Actions): `resolve` expõe `previous_sha`, o `notify` recebe `PREVIOUS_SHA`, o passo que captura o commit anterior roda antes de `staging` e não falha o job, e `staging`/`production` continuam sem referência a `previous_sha`.
- AC-07: `check_engineering_skills.py`, `check_matt_workflow.py` e busca por `intervalo` nos arquivos de contrato.

Fora do alcance local: o primeiro merge em lote real confirma o job no Actions. O merge desta própria entrega é um teste do AC-02 (um PR entre o commit anterior e o publicado).

## Riscos e exclusões

- `previous_sha` lido por HTTP de produção: se `/api/version` estiver fora do ar no início do run, o aviso volta ao comportamento de hoje (só a ponta). É a degradação prevista, não um defeito novo.
- Intervalo maior que 100 commits (`per_page=100`) cai na degradação; não esperado no ritmo atual de merges.
- Uma consulta de PR por commit do intervalo: no pior caso dezenas de chamadas curtas de `gh api` dentro do job `notify`, que já tem `continue-on-error`.
- Se produção estava em um commit que não é ancestral (rollback), só a ponta é avisada; os cards entre eles não recebem aviso nesse caso, por decisão do usuário.
- O comentário continua sendo feito com `MULTICA_TOKEN` (token pessoal do usuário) e menciona sempre o `dev_ultra_lider`; limitações da DMTE-506 mantidas.
- As referências `development-delivery` ficam no runtime Multica, fora do repositório, e são atualizadas à parte, nesta entrega, pelo CLI da plataforma. Não muda `aponta_release.py`, CI, a fila de merge nem os jobs `staging`/`production`.

## Ticket único

T1: `.github/workflows/deploy.yml` (output `previous_sha` e `PREVIOUS_SHA`), `scripts/avisar_card.py`, `scripts/test_avisar_card.py`, `docs/delivery/WORKFLOW.md`, `.agents/skills/aponta-delivery` e `.agents/skills/aponta-flow`, mais as referências de `development-delivery` no runtime (AC-01 a AC-07). Sem bloqueadores; um PR. Nenhum ticket extra no tracker: a divisão é uma só e a #253 é a issue da entrega.
