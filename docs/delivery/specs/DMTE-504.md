# publicar_qa.py: target_url do status Independent QA no host ativo do Multica

Identidade: DMTE-504, issue dmrepositorio/aponta#235, Tier 1. Bug pequeno de governança (`scripts/`), sem UI; Architect dispensado (WORKFLOW.md, Tier 1 com critério na issue).

## Situação atual
`scripts/publicar_qa.py` monta o `target_url` do commit status `Independent QA` com `https://multica.dmtecnologia.cloud/dm-tecnologia/issues/<id>`. Esse host foi desativado e não responde, então o link "Details" do check abre uma página morta em todo PR. O status em si continua válido.

## Situação desejada
O `target_url` usa o host em uso, `https://multica.aponta.cloud`, com o mesmo caminho `/dm-tecnologia/issues/<id>`.

## Acceptance criteria
- AC-01: o payload do status `Independent QA` enviado a `repos/<repo>/statuses/<sha>` tem `target_url` iniciado por `https://multica.aponta.cloud/dm-tecnologia/issues/` e o id da issue de origem; nenhuma ocorrência de `multica.dmtecnologia.cloud` permanece em `scripts/publicar_qa.py`.

## Testes
`scripts/test_publicar_qa.py`, seam: o payload do status, extraído de `main()` para `status_payload(source, carried)` (função pura, sem mudança de comportamento no refactor). AC-01 é coberto por `QaStatusLinkTests.test_target_url_points_to_the_active_multica_host` (host novo e id no `target_url`) e `QaStatusLinkTests.test_decommissioned_host_is_gone_from_the_script` (o fonte de `publicar_qa.py` não cita o host antigo). `main()` não é exercitado: depende de `docker exec` no Postgres do Multica e de `gh api`; a chamada `gh api` continua recebendo o payload sem alteração.

## Riscos e exclusões
Fora do escopo: `.delivery/registry.json` e manifestos antigos com o host antigo em `multica_url`. Nada além do `target_url` muda no payload (`state`, `context`, `description`). Reverter é recolocar o host anterior.
