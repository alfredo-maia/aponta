# SPEC — Governança de entrega Aponta

GitHub: alfredo-maia/aponta#92. Multica: DMTE-159, UUID 01a17485-8de1-7e6d-950a-1e295fef336b.

## Objetivo e escopo

Aplicar o contrato aprovado sem alterar código funcional do helpdesk nem o CD. A governança deve ser executável com Python padrão, com branch/PR, evidências, registro canônico de identidades e instruções coerentes.

## Critérios

- AC-01: registro impede duas entregas canônicas para a mesma issue GitHub ou UUID Multica; o PR declara uma identidade e referencia a issue correta sem fechamento antecipado.
- AC-02: coleta de RED/GREEN identifica comando, teste, horário, base e fontes; rejeita import/setup como RED, logs alterados, ordem inválida e comandos/testes divergentes.
- AC-03: Tier 2/3 exige SPEC com ACs e testes; UI exige avaliação de DS e componentes DS novos/alterados precisam de story ou exceção justificada.
- AC-04: CI executa testes do verificador e o contrato no SHA do PR, sem segredos e sem alterar deploy; o template orienta preenchimento.
- AC-05: demandas abertas possuem identidade canônica, tipo, ciclo e situação; migração preserva descrições, histórico, decisões de adiamento e bloqueios existentes.
- AC-06: agentes seguem branch/PR, coleta de evidências e exclusão cooperativa de escrita; recursos globais de outros projetos permanecem intactos.

## Decisões

GitHub guarda escopo; Multica guarda execução e stages. O registro versionado guarda a identidade e os ciclos. Os manifests por entrega guardam critérios, arquivos, SPEC e ponteiros de evidência. Execução local autenticada verifica vínculos recíprocos; CI verifica contrato sem credenciais Multica. Gate não afirma comprovar sozinho intenção, ordem histórica infalível ou ausência de defeitos.

Manter reservas futuras em backlog e revisão independente; branch/PR passa a ser a política aprovada. Migração não executa features nem fabrica evidências de TDD para commits legados. O deploy continua sob gestão do usuário.

## Validação

Testes unitários cobrem identidade, caminhos, critérios, TDD, DS, redaction e exclusão de escrita. RED comportamental observado no módulo importável antes da implementação; GREEN após implementação. O gate roda no próprio PR de implantação com vínculo #92/DMTE-159. CI existente permanece responsável pelos testes do produto.
