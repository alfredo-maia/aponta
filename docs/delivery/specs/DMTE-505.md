# Líder coloca o PR aprovado na fila de merge e retoma por wakeup

Identidade: DMTE-505, issue dmrepositorio/aponta#239, Tier 1, ciclo 2026-11-09/2026-11-22. Decisão do usuário em 13/11/2026.

## Situação

O contrato do repositório atribui ao usuário a entrada do PR na fila de merge. A política vigente do `dev_ultra_lider` é outra: com `RESULTADO=APROVADO` do `dev_ultra_qa` e os quatro checks exigidos verdes no head exato, ele mesmo roda `gh pr merge <n> --auto` (a fila decide a estratégia) e cria no pai os wakeups `--until-pr merged` e `--until-pr conflicts`. O gate continua sendo a fila, que só integra com os quatro checks no candidato, incluindo `Independent QA`.

## Decisão

Documentação e perfil de skill do repositório passam a dizer o mesmo que a política vigente, sem mudar código nem scripts. A regra vale para o Squad Ultra Rápido; os demais squads não têm essa autorização nas instruções dos seus agentes e continuam com o usuário colocando o PR na fila. Aceite, deploy e rollback seguem do usuário. As referências `development-delivery` do runtime Multica ficam fora do repositório e fora deste escopo.

## Acceptance criteria

- AC-01: `docs/delivery/WORKFLOW.md` descreve "Apto para integração" com o líder colocando o PR na fila após QA aprovado e checks verdes, e "Integrado" disparado por essa entrada na fila; o aceite do usuário continua depois de "Publicado".
- AC-02: a espera pelo merge é descrita como `blocked` + wakeups `--until-pr merged` e `--until-pr conflicts` criados pelo líder, com retomada pelo wakeup e não por confirmação humana no fio.
- AC-03: nenhuma frase restante em `AGENTS.md`, `docs/` e `.agents/skills/` diz que o merge é decisão ou clique do usuário.

## Testes

Sem comportamento: busca por referências (AC-03) e `check_engineering_skills.py`, `check_matt_workflow.py` e `scripts/aponta_delivery.py check`.
