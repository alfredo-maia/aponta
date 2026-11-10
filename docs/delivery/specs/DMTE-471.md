# Coletor recusa RED com código revertido e comando que gera o manifest

Identidade: DMTE-471, issue dmrepositorio/aponta#170, Tier 2, ciclo 2026-11-09/2026-11-22. Pedido do usuário (Alfredo) em 10/11/2026, como reforço da DMTE-470.

## Situação atual (observada em 10/11/2026)

- O QA rejeitou os PRs #151, #159 e #160 porque o RED foi obtido revertendo código já commitado (`git show <commit anterior>:arquivo > arquivo`), com o código restaurado antes do GREEN.
- `record --phase red` grava essa evidência: ele só exige falha por asserção. Um arquivo revertido exatamente à base nem aparece em `source_hashes`, porque deixa de diferir da base.
- `check` aceita a evidência: confere hash do log, comando, testes e os fontes do GREEN. Nada compara os fontes do RED com o commit em que ele diz ter rodado.
- O defeito só aparece na revisão do QA, uma rodada depois, e a correção pede outra rodada.
- O manifest é copiado de outra entrega e editado à mão; identidade, ciclo e critérios errados só aparecem no check.

## Situação desejada

Um RED que não rodou contra o código commitado da entrega é recusado na hora da captura, com a lista dos arquivos, e não passa no contrato se foi gravado de outro jeito. O manifest nasce de um comando, já com identidade, ciclo e critérios da SPEC.

## Decisões

- "Revertido" é definido pelo Git, sem heurística de texto: um fonte que a entrega alterou entre a base e o `HEAD` e que, no diretório de trabalho, tem o conteúdo de uma versão anterior (a da base ou a de um commit anterior da branch) ou não existe.
- Edição nova e ainda não commitada num fonte da entrega, como um stub neutro, não é reversão: o conteúdo não coincide com nenhuma versão anterior.
- Arquivos de teste da própria evidência ficam fora da regra; governança, docs e ruído de build também, como no restante do coletor.
- No `check`, a mesma regra é aplicada ao registro do RED: para cada fonte commitado entre `base_sha` e `head_sha` da evidência, o hash gravado em `source_hashes` não pode ser o de uma versão anterior nem estar ausente quando o arquivo existe no `head_sha`. Evidência cujo `head_sha` o checkout não resolve não é julgada por esta regra.
- A recusa na captura não grava arquivo de evidência nem log.
- `init` escreve `.delivery/deliveries/DMTE-N.json` com identidade, ciclo automático, Tier, SPEC, critérios lidos das linhas `AC-NN: descrição` da SPEC, caminhos padrão de evidência e avaliação de DS. Os testes de cada critério ficam vazios de propósito: o `check` falha até serem preenchidos. Não grava `base_sha` nem `changed_files`.
- `init` recusa manifest já existente, SPEC sem critérios numerados, identidade inválida e issue GitHub ou pai Multica já usados por outra entrega.

## Acceptance criteria

- AC-01: `capture` da fase RED levanta erro e não grava evidência quando um fonte commitado pela entrega está, no diretório de trabalho, igual à versão da base, igual à de um commit anterior da branch, ou ausente.
- AC-02: `capture` da fase RED continua gravando quando o teste novo falha contra o código commitado atual e quando um fonte commitado tem edição nova ainda não commitada.
- AC-03: `check_contract` rejeita uma entrega cujo RED registra um fonte commitado numa versão anterior à do `head_sha` da evidência, e continua aceitando o par de um ciclo de correção honesto.
- AC-04: `init_manifest` gera um manifest com identidade, ciclo automático, SPEC e os critérios da SPEC, sem `base_sha` nem `changed_files`; o manifest gerado falha no validador enquanto os testes dos critérios estão vazios e passa depois de preenchidos.
- AC-05: `init_manifest` recusa manifest existente, SPEC sem critérios numerados e identidade já usada por outra entrega.

## Testes

`scripts/test_aponta_delivery.py`, classes `HonestRedTests` (AC-01 a AC-03) e `InitManifestTests` (AC-04 e AC-05), com repositórios Git reais em diretório temporário. TDD: os testes entram com `stale_sources` e `init_manifest` como stubs neutros; o RED é a falha por asserção desses testes; o GREEN usa o mesmo comando e os mesmos arquivos.

## Riscos e exclusões

- A regra compara conteúdo com versões que o Git conhece. Reverter para um conteúdo que nunca foi commitado (por exemplo, apagar à mão metade de uma função) não é detectado; isso continua com o QA.
- Evidências de entregas já mescladas não são reavaliadas. PRs abertos são: um par antigo com RED revertido passa a falhar no contrato, que é o efeito pretendido.
- Não muda o rigor do QA, o conteúdo dos checks de CI nem o deploy.

## Ticket único

T1: `scripts/aponta_delivery.py`, `scripts/test_aponta_delivery.py` e documentação (AC-01 a AC-05). Sem bloqueadores.
