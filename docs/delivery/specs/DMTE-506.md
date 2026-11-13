# CD (Produção) avisa o card no Multica ao concluir

Identidade: DMTE-506, issue dmrepositorio/aponta#241, Tier 2, ciclo 2026-11-09/2026-11-22. Decisão do usuário (Alfredo) em 13/11/2026; o secret `MULTICA_TOKEN` já está nos secrets do repositório.

## Situação atual (observada em 13/11/2026)

- O wakeup `--until-pr merged` acorda o líder no instante do merge, antes de o CI de push e o `CD (Produção)` terminarem (cerca de 10 min). O líder agenda um horário e volta para conferir.
- `.github/workflows/deploy.yml` tem três jobs (`resolve`, `staging`, `production`) e não fala com o Multica. `resolve.outputs.sha` é a ponta da `main` que o run publica.
- A fila de merge integra um PR por commit (`max_entries_to_merge: 1`). O corpo do PR traz `Aponta-Delivery: DMTE-N`; o pai Multica está em `multica_id` no manifest `.delivery/deliveries/DMTE-N.json` ou, nas entregas antigas, em `.delivery/registry.json`. `parent_of()` em `scripts/publicar_qa.py` já faz essa leitura.
- Produção responde o commit em `https://dm.aponta.cloud/api/version` e `/version.json` (Caddy da VPS, porta do web de produção; conferido em 13/11 com `curl`).
- Servidor Multica (`server/internal/handler/comment.go`, `CreateCommentRequest`): `POST /api/issues/<id>/comments` com o corpo no campo `content`; token pessoal `mul_` em `Authorization: Bearer` e o workspace em `X-Workspace-ID`.

## Decisões

- Um quarto job `notify` no fim do `deploy.yml`, com `needs: [resolve, staging, production]` e `if: always() && needs.resolve.outputs.sha != ''`. Os jobs `resolve`, `staging` e `production` não mudam. Um job final cobre sucesso e falha de qualquer um dos dois com um único código.
- O job faz checkout do commit implantado (`resolve.outputs.sha`), com `contents: read` e `pull-requests: read`, e roda `scripts/avisar_card.py`. `MULTICA_TOKEN` entra só no `env` desse passo.
- Resolução: `gh api repos/$GITHUB_REPOSITORY/commits/<sha>/pulls` → PRs do commit → linhas `^Aponta-Delivery: (DMTE-\d+)$` → pai via `parent_of()` (reaproveitado de `publicar_qa.py`). Sem PR, sem a linha, ou com mais de uma entrega distinta, o script registra o motivo no log e termina com 0, sem comentar.
- Resultado: `production = success` → `CD (Produção) concluído`; senão, `staging` diferente de sucesso → `CD falhou em staging`; senão `CD falhou em produção`. Resultado `cancelled` aparece como o próprio valor entre parênteses.
- Corpo do comentário, começando pela menção `[@dev_ultra_lider](mention://agent/0427564a-c9cc-494e-8ea1-592a98588251)`: resultado, commit (SHA40), PR, link do run e, no sucesso, o commit que `/api/version` e `/version.json` de produção devolveram e se coincide com o implantado. Sem log.
- Falha no aviso nunca derruba o CD: o script captura qualquer exceção, redige o token na mensagem e sai com 0; o passo também tem `continue-on-error: true`.
- Fechamento da entrega, no contrato: o aviso do CD chega por menção no card; o líder não agenda horário quando o projeto tem esse aviso; o fechamento é um único comentário com **Solicitado** e **Entregue**, e o card fica em `in_review` para o aceite.

## Acceptance criteria

- AC-01: após um merge pela fila com `CD (Produção)` verde, o card pai da entrega recebe um comentário do workflow mencionando o `dev_ultra_lider`, com SHA, PR, link do run e versão em produção, em até 2 minutos do fim do job.
- AC-02: se `staging` ou `production` falhar, o card recebe o comentário de falha com o job e o link do run.
- AC-03: commit na `main` sem PR ou sem `Aponta-Delivery` não gera comentário nem falha o CD.
- AC-04: erro ao chamar a API do Multica não altera o resultado do workflow de CD.
- AC-05: `docs/delivery/WORKFLOW.md` e as referências de `development-delivery` descrevem o aviso do CD por menção e o fechamento com resumo Solicitado × Entregue em `in_review`.

## Testes

Seam: funções puras e duas fronteiras injetáveis em `scripts/avisar_card.py` (consulta ao GitHub e chamada HTTP), no padrão de `publicar_qa.py`/`test_publicar_qa.py`. `scripts/test_avisar_card.py` cobre, com fakes e sem rede:

- AC-01/AC-02: montagem do corpo (menção primeiro, SHA, PR, run, versão; falha com o job); resultado a partir de `staging`/`production`; POST para `/api/issues/<pai>/comments` com os dois cabeçalhos e `content`.
- AC-03: commit sem PR, PR sem `Aponta-Delivery`, duas entregas distintas: nenhuma chamada ao Multica, saída 0.
- AC-04: exceção na chamada HTTP e resposta 4xx: saída 0, token ausente do texto registrado.
- Workflow: o `deploy.yml` tem o job `notify` com `needs`, `always()` e `continue-on-error`, e `MULTICA_TOKEN` aparece só nele (leitura de texto; não há runner local do Actions).
- AC-05: busca por referências e `check_engineering_skills.py`, `check_matt_workflow.py`.

Teste de ponta a ponta (AC-01/AC-02 no ambiente real): rodar o script com `MULTICA_TOKEN` contra um card de teste e conferir o comentário; o primeiro CD real depois do merge confirma o job no Actions.

## Riscos e exclusões

- Se dois PRs entrarem na `main` antes de o CD rodar, o run publica a ponta e só o PR do commit da ponta recebe o aviso; o anterior fica sem aviso. O líder cobre esse caso com o wakeup `Conferir CD do commit`. Não é resolvido aqui.
- O aviso menciona sempre o `dev_ultra_lider`. Entrega de outro squad que passe pelo mesmo CD também o acordaria; fica registrado como limitação.
- `MULTICA_TOKEN` é token pessoal do usuário: o job só lê, nunca grava em artefato nem imprime. Um comentário feito com ele aparece como do usuário.
- As referências `development-delivery` ficam fora do repositório (perfil do runtime Multica) e são atualizadas à parte, nesta mesma entrega, pelo CLI da plataforma.
- Não muda `resolve`, `staging`, `production`, `aponta_release.py`, CI nem a fila de merge.

## Ticket único

T1: `scripts/avisar_card.py` + `scripts/test_avisar_card.py`, job `notify` em `.github/workflows/deploy.yml`, `docs/delivery/WORKFLOW.md` e `.agents/skills/aponta-delivery`/`aponta-flow` (AC-01 a AC-05). Sem bloqueadores; um PR.
