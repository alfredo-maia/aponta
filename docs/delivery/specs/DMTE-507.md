# registry.json: links do Multica com o host ativo

Identidade: DMTE-507, issue dmrepositorio/aponta#243, Tier 1, ciclo 2026-11-09/2026-11-22.

## Situação

As 26 entradas de `deliveries` em `.delivery/registry.json` têm `multica_url` com o host desativado `https://multica.dmtecnologia.cloud`. O host em uso é `https://multica.aponta.cloud`, com o mesmo caminho. Nenhum script do repositório escreve `multica_url` e `publicar_qa.py` usa `multica_id`; só os links de registro estão quebrados.

## Decisão

Trocar o host nas `multica_url` do registry, preservando caminho, identificador e o resto do arquivo. Os manifestos existentes em `.delivery/deliveries/` (nenhum grava `multica_url`; só descrições de critério citam o host) e o código ficam como estão. Esta é uma correção única de dado legado, não o registro de uma entrega no registry: a DMTE-507 se identifica só pelo próprio manifesto, como manda `docs/delivery/WORKFLOW.md`. O AC-02 vale para o `registry.json`; o manifesto e a SPEC desta entrega são arquivos novos exigidos pelo contrato.

## Acceptance criteria

- AC-01: `grep -c "multica.dmtecnologia.cloud" .delivery/registry.json` retorna 0 e `grep -c "https://multica.aponta.cloud/dm-tecnologia/issues/" .delivery/registry.json` retorna o número de entradas existentes (26 hoje).
- AC-02: o diff do PR toca só o host dessas linhas: nenhuma outra linha de `.delivery/registry.json` muda.
- AC-03: `python3 scripts/aponta_delivery.py check` continua passando.

## Testes

Sem comportamento de produto: os `grep` do AC-01, `git diff --stat` do AC-02 e `scripts/aponta_delivery.py check` do AC-03.
