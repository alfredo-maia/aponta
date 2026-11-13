# registry.json: links do Multica com o host ativo

Identidade: DMTE-507, issue dmrepositorio/aponta#243, Tier 1, ciclo 2026-11-09/2026-11-22.

## Situação

As 26 entradas de `deliveries` em `.delivery/registry.json` têm `multica_url` com o host desativado `https://multica.dmtecnologia.cloud`. O host em uso é `https://multica.aponta.cloud`, com o mesmo caminho. Nenhum script do repositório escreve `multica_url` e `publicar_qa.py` usa `multica_id`; só os links de registro estão quebrados.

## Decisão

Trocar o host nas `multica_url` do registry, preservando caminho, identificador e o resto do arquivo. Manifestos em `.delivery/deliveries/` (sem URL) e código ficam como estão.

## Acceptance criteria

- AC-01: `grep -c "multica.dmtecnologia.cloud" .delivery/registry.json` retorna 0 e `grep -c "https://multica.aponta.cloud/dm-tecnologia/issues/" .delivery/registry.json` retorna o número de entradas existentes (26 hoje).
- AC-02: o diff do PR toca só o host dessas linhas: nenhuma outra linha de `.delivery/registry.json` muda.
- AC-03: `python3 scripts/aponta_delivery.py check` continua passando.

## Testes

Sem comportamento de produto: os `grep` do AC-01, `git diff --stat` do AC-02 e `scripts/aponta_delivery.py check` do AC-03.
