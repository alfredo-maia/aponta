# Gate de entrega sem retrabalho

Identidade: DMTE-470, issue dmrepositorio/aponta#168, Tier 2, ciclo 2026-11-09/2026-11-22. Pedido direto do usuário (Alfredo): "arrume de forma definitiva" a dificuldade de levar um PR até o merge.

## Situação atual (observada em 10/11/2026)

- PRs #151, #158, #159 e #160 com `Lint, typecheck, unit tests`, `E2E` e `Delivery contract` verdes e `mergeStateStatus: BLOCKED`: falta o status `Independent QA` no head. O QA tinha aprovado um SHA anterior; depois entraram commits de manifest e de registro.
- 18 falhas em 32 execuções recentes do workflow `Aponta delivery`.
- O manifest grava `base_sha`, e o verificador exige que seja igual ao merge-base do PR. Com a `main` protegida em modo `strict`, toda atualização da branch muda o merge-base e pede um commit de manifest.
- O manifest lista `changed_files` à mão; arquivo fora da lista reprova o check.
- Todo PR acrescenta a própria entrada no fim de `.delivery/registry.json`; PRs paralelos conflitam nesse arquivo.
- O atestado do QA vale para um SHA exato. Cada commit acima, mesmo sem mudar produto, pede um QA novo.
- A fila de merge exige `Independent QA` no commit que ela cria, e nenhum workflow publica esse check lá. O PR #163 teve CI e contrato verdes na fila às 16:47 e foi mesclado às 19:08 pelo administrador.
- Na fila, o verificador mede as fontes do GREEN na árvore do commit da fila; com outro PR ou a `main` à frente, os hashes deixam de coincidir.

## Situação desejada

A `main` andar, outro PR entrar ou um ajuste de governança não geram commit de manifest nem QA novo. Um PR com código revisado e CI verde chega ao merge pela fila, sem bypass.

## Decisões

- Base e arquivos alterados são fatos do PR e passam a ser lidos do Git a cada verificação. `base_sha` e `changed_files` no manifest deixam de ser exigidos; manifests antigos continuam válidos.
- A base é o merge-base mais recente entre o head e a base do evento ou a branch base, porque o SHA de base do evento pode estar defasado.
- A classificação de UI e de código com comportamento usa o diff real, não a lista declarada. Fica mais rígido: não dá para omitir um arquivo.
- Uma entrega sem entrada em `registry.json` é identificada pelo próprio manifest. A unicidade de issue GitHub e de pai Multica é verificada entre o registro e todos os manifests. `registry.json` permanece para épicos e histórico.
- O atestado do QA acompanha o código revisado: `publicar_qa.py` republica em um SHA novo quando o código próprio da entrega (diff contra a `main`, fora de `.delivery/` e `docs/`), os critérios de aceite do manifest e a SPEC são idênticos aos do SHA aprovado. `.github/` e `AGENTS.md` contam como código.
- Na fila de merge, o contrato é verificado na árvore do head do PR (worktree temporário), e um workflow só de `merge_group` publica o check `Independent QA` quando o head do PR tem o atestado.
- A coleta de evidência roda o comando de teste sem cache de bytecode: um fonte editado no mesmo segundo e com o mesmo tamanho executava o `.pyc` antigo.
- Fora do código: desligar `strict` na regra da `main`, já que a fila testa o resultado combinado. É mudança de configuração do repositório, feita pelo administrador depois do merge.

## Acceptance criteria

- AC-01: um PR cujo manifest não tem `base_sha` nem `changed_files` passa no contrato; a evidência é validada contra o merge-base calculado.
- AC-02: depois que a `main` anda sem tocar nos arquivos da entrega e a branch recebe a `main`, o contrato passa sem nenhum commit de manifest, inclusive quando o SHA de base do evento está defasado.
- AC-03: arquivo alterado e não declarado no manifest não é erro, e um arquivo de UI que entra no PR é classificado pelo diff: sem avaliação de DS, o contrato falha.
- AC-04: uma entrega ausente de `registry.json` é aceita pelo próprio manifest; dois manifests com a mesma issue GitHub ou o mesmo pai Multica são recusados; entrada existente no registro continua obrigando o manifest a coincidir com ela.
- AC-05: num evento `merge_group` em que o commit da fila contém mudança de fonte de outro PR, o contrato é validado na árvore do head do PR e passa; o worktree temporário é removido. Fonte alterado depois do GREEN e checkout diferente do esperado continuam recusados.
- AC-06: `carry_source` devolve o SHA aprovado quando o commit novo só toca `.delivery/` e `docs/` ou traz a `main` sem tocar nos arquivos revisados; devolve nada quando muda código, entra arquivo novo, a `main` altera um arquivo revisado, muda workflow, mudam os critérios, muda a SPEC ou a revisão mais recente daquele SHA não é uma aprovação. O pai Multica vem do manifest quando o registro não tem a entrega.
- AC-07: `qa_merge_queue` extrai o número do PR do `head_ref` da fila e só aprova quando o status `Independent QA` mais recente do head do PR é `success`.
- AC-08 (operacional, fora do CI): um PR real com atestado passa pela fila de merge e é mesclado sem bypass.

## Testes

`scripts/test_aponta_delivery.py` (classe `DeliveryGateTests`) e `scripts/test_publicar_qa.py` (classes `QaCarryTests` e `QaMergeQueueTests`), com repositórios Git reais em diretório temporário. TDD: `check_contract` foi extraído de `main()` sem mudar comportamento e os stubs `carry_source`, `parent_of` e `qa_merge_queue` entraram neutros; contra isso, 15 testes falharam por asserção (`.delivery/evidence/DMTE-470/red.json`). GREEN com o mesmo comando e os mesmos arquivos de teste (`green.json`).

## Riscos e exclusões

- AC-08 e o comportamento do GitHub ao casar o check da fila com o status do head só se verificam com uma execução real da fila.
- O atestado republicado depende de o QA declarar o SHA aprovado em um campo `SHA:`; aprovação sem esse campo não é reaproveitada.
- Integração com a `main` nova não é revista pelo QA quando o atestado é republicado: quem cobre é o CI no head e na fila.
- `scripts/atualizar_entrega.py` não muda nesta entrega; continua útil só para regravar o GREEN quando a `main` toca um arquivo da entrega.
- Não muda o rigor do QA, o conteúdo dos checks de CI nem o deploy.

## Ticket único

T1: `scripts/aponta_delivery.py`, `scripts/publicar_qa.py`, `scripts/qa_merge_queue.py`, `.github/workflows/independent-qa-queue.yml`, testes e documentação (AC-01 a AC-07). Sem bloqueadores.
