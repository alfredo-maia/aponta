# Deploy publica só a ponta da main

Identidade: DMTE-472, issue dmrepositorio/aponta#175, Tier 2, ciclo 2026-11-09/2026-11-22. Pedido do usuário (Alfredo) em 10/11/2026, depois de um deploy que recuou a produção.

## Situação atual (observada em 10/11/2026)

- `CD (Produção)` roda a cada CI concluído na `main` e publica o commit desse CI (`workflow_run.head_sha`).
- Cinco PRs saíram da fila de merge entre 22:45 e 22:46 UTC. Os CIs terminaram fora de ordem: os deploys publicaram `187e16d`, depois `0b27b57`, depois `8b94611`, que é anterior. Os runs de `6322e7c` e `8f29c1f` foram cancelados como pendentes substituídos (grupo de concorrência com `cancel-in-progress: false` mantém só o pendente mais novo).
- A produção ficou no commit `8b94611`, sem os PRs #150, #160 e #173, até o CI da ponta ser reexecutado à mão.
- O script remove os quatro containers e só depois roda `up -d --build`: o site fica fora do ar durante todo o build, em cada deploy.
- `git reset --hard "$DEPLOY_SHA"` move a branch ativa no checkout da VPS; em 10/11 era a branch de um agente.

## Decisões

- O commit publicado é a ponta da `main` no momento do run, lida pela API do GitHub. Qualquer run pode publicá-la, desde que o CI de push dela tenha passado; se o run foi disparado pelo próprio CI da ponta, isso já está garantido pela condição do job.
- Run disparado por CI de commit mais antigo, com o CI da ponta ainda sem sucesso, termina sem publicar. O CI da ponta dispara outro run ao terminar. Se o CI da ponta falhar, nada é publicado, como hoje.
- Um arquivo de estado na VPS (`~/.local/state/aponta/deployed-sha`) guarda o commit publicado. Run para um commit que já está no ar, com a API em execução, termina sem tocar nos containers.
- `docker compose build` roda antes da troca. Só containers parados (`exited`, `created`, `dead`) são removidos antes do `up -d`; os que estão em execução são trocados pelo compose.
- O checkout fica em HEAD destacado no commit publicado (`git checkout -f --detach`).
- O grupo de concorrência não muda: um deploy por vez, sem cancelar o que está em andamento.

## Acceptance criteria

- AC-01: com vários commits entrando na `main` juntos, a produção termina na ponta da `main` e nunca num commit anterior ao que já estava no ar.
- AC-02: um run disparado por CI de commit que não é a ponta não publica enquanto o CI da ponta não tiver passado.
- AC-03: um run para o commit que já está em produção termina sem recriar containers.
- AC-04: durante o build das imagens os containers de produção continuam em execução.
- AC-05: o deploy não move nenhuma branch local do checkout da VPS.

## Testes

O workflow só executa no GitHub Actions contra a VPS; não há runner local para ele. Verificação feita antes do merge: YAML válido, `bash -n` nos dois scripts, e a consulta `actions/workflows/ci.yml/runs?head_sha=…&event=push&status=success` conferida à mão (1 para um commit com CI verde, 0 para a ponta com o CI em reexecução). Os cinco critérios se confirmam no primeiro deploy real depois do merge, pelo log do run e por `docker ps`.

## Riscos e exclusões

- O primeiro deploy depois do merge é o teste real. Se o script falhar, a produção fica como estava, porque a troca só acontece depois do build.
- A troca dos containers pelo compose ainda causa alguns segundos de indisponibilidade; deploy sem queda nenhuma pede proxy com duas instâncias e fica fora desta entrega.
- Entre ler a ponta e publicar pode entrar outro commit; o CI dele dispara o próximo run.
- Não muda CI, fila de merge nem gate de entrega.

## Ticket único

T1: `.github/workflows/deploy.yml` (AC-01 a AC-05). Sem bloqueadores.
