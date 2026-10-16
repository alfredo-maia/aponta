# Contratos e valorização de apontamentos — DMTE-37 / GitHub #68

Tier 3. Plano autorizado por alfredo no comentário de 15/10/2026 “Boa vamos implementar ?”. Acesso ao GitHub Project confirmado e card #68 movido para Em Andamento antes do código.

## Escopo aprovado

Evoluir o módulo existente com cadastro, edição, pesquisa e detalhe de contratos; nome, organização, modalidade, vigência, franquia mensal e tarifa explícita de hora excedente. Vincular novos apontamentos ao contrato, registrar memória imutável do cálculo e apresentar relatórios informativos. Não emitir cobranças.

Adendos completos, notificações, deslocamentos, anexos, transporte de saldo e faturamento automático permanecem fora desta primeira entrega.

## Evidência de referência

Playwright navegou no TiFlux autenticado; REA 6.4.0 observou a mesma página por CDP. Foram lidas listagem, sete abas de um contrato por horas e primeira etapa do cadastro, sem alterações. A tarifa de excedente é um campo separado da mensalidade/franquia. Evidência básica: `ev_b881b6b6e78262af76590a31b1b7723fdcf302fe02ebb5d115e18fdba77fe60e`; histórico: `ev_dbb0ea291bda380f5a87caa079386efad71f531db78a27d5e53796e53a2035dd`; ciclos: `ev_4f1d3a3d17acf637f790b2027adba4b581ef9edf63bd87e87473c517253e5a08`.

Limites: observação de interface administrativa de um contrato por horas; regras internas de cobrança, outros papéis e outras modalidades do TiFlux não foram comprovados. As regras seguintes são decisões da implementação Aponta, não engenharia reversa comprovada do algoritmo do TiFlux.

## Regras e compatibilidade

- Novos campos opcionais preservam contratos legados. `monthlyValue`, `hoursLimit` e `value` existentes permanecem compatíveis; novos cálculos usam centavos inteiros. Não converter nem recalcular valores históricos.
- Franquia nova usa minutos inteiros; quando ausente, `hoursLimit` legado fornece apenas a franquia operacional. Nunca derivar tarifa de excedente da mensalidade.
- Contrato elegível pertence à organização do solicitante, está ativo e cobre todo o intervalo de execução. Se houver vários, exigir escolha explícita. Contrato informado inválido gera erro; ausência de contrato mantém valor desconhecido.
- Ciclo mensal civil em America/Sao_Paulo, considerando também offsets históricos. Intervalos cruzando ciclos são segmentados, conservando o total de minutos.
- Novos apontamentos da UI convertem o horário civil de Brasília em instantes UTC e registram `timeConvention: UTC` no snapshot. A API fornece esse marcador operacional mesmo ao ocultar valores; a UI continua lendo registros antigos sem marcador pela convenção legada, sem reescrever seus horários.
- Na UI, o fim da vigência por dia inclui o dia selecionado até a meia-noite local seguinte; a API guarda esse instante como limite. Editar outros campos preserva timestamps precisos de vigência que não foram alterados.
- Alocação de franquia ocorre em ordem de registro, inclusive para lançamentos retroativos. Cada snapshot registra essa política. Apontamentos posteriores não reprecificam os anteriores; excluir um registro libera consumo para registros futuros, sem recalcular os restantes.
- Uma trava de linha do contrato serializa registros/exclusões concorrentes. Snapshot guarda contrato, organização, franquia e segmentos com minutos cobertos/excedentes, tarifa e valor em centavos.
- Cobertura fixa inclui os minutos, valor zero. Pacote de horas usa `max(0, franquia - consumo)` e valoriza somente excedentes. Tarifa ausente mantém o excedente desconhecido; tarifa zero é conhecida e válida.
- Garantia é não faturável, vale zero e não consome franquia. Valor manual é exclusivo de ADMIN, não negativo e arredondado para centavos; não consome franquia. Valor manual positivo não pode ser marcado não faturável. Apontamentos contratuais não faturáveis também não consomem franquia.
- Intervalos devem ter de um minuto até um ano; valores novos devem caber em centavos inteiros de 32 bits. Isso limita cálculo, duração de transações e tamanho dos snapshots.
- Alterações futuras em tarifa, organização ou situação do contrato não alteram snapshots. Contratos com apontamentos não podem ser excluídos nem transferidos para outra organização.
- Operações combinadas de apontamento, estágio e resposta usam a mesma transação. Estágio reutiliza as regras existentes de tickets/SLA. Notificações são publicadas após o commit.

## Permissões

ADMIN administra contratos e acessa valores. AGENT e AGENT_MASTER têm somente leitura operacional dos contratos ativos e não recebem campos financeiros dos apontamentos. CLIENT_MASTER acessa contratos e relatórios financeiros apenas da própria organização. CLIENT não acessa contratos/apontamentos. Leitura e escrita de apontamentos respeitam `TenantHelper.getTicketWhere`, além das regras existentes de mesa/grupo/autor.

Relatórios permanecem exclusivos de ADMIN/CLIENT_MASTER. Snapshots com organização histórica diferente da organização autorizada são excluídos; o filtro atual de visibilidade do ticket também continua aplicado. Isso pode omitir registros após transferência de solicitante, em vez de expor informação financeira entre organizações.

## Relatórios

Preservar campos existentes de minutos e adicionar total conhecido em centavos, quantidade de valores desconhecidos, minutos cobertos e excedentes. Nunca tratar desconhecido como zero. Valores mensais do contrato não são somados em cada apontamento.

Filtros por contrato e mês selecionam segmentos de ciclos completos pelo início do ciclo; não rateiam valores históricos por dias. Registros sem segmentos usam a data de início da execução. A UI explicita o caráter informativo.

## Entregas e validação

1. Modelo aditivo e migração Prisma gerada em Postgres 16 local.
2. API de contratos e testes de validação, vigência, papéis, pesquisa, detalhe e histórico.
3. Cálculo, snapshots, escolha de contrato, segurança e transação com TDD.
4. UI pt-BR usando design system existente e stories de estados/permissões.
5. Relatórios, testes reais de concorrência/rollback e Playwright do fluxo contrato → apontamento → relatório.
6. Revisão independente, correção dos achados, suíte completa test/lint/typecheck, builds, push e entrega verificável.

Antes da mudança, 69 testes focados de API e 46 da web passaram. Novos testes devem comprovar os casos de franquia exata/parcial/esgotada, múltiplos contratos, organização/vigência incorretas, tarifa zero/ausente, fronteiras de ciclo, concorrência, rollback e proteção financeira. Preservar pré-apontamentos, rascunhos, resposta pública, autor administrativo e estágio/SLA.
