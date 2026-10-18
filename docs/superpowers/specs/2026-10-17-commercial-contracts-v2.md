# DMTE-37 / GitHub #70 — contratos comerciais e elegibilidade impeditiva

Tier 3. Autorizado por alfredo em 17/10/2026: “Vamos implementar”. Base: diagnóstico revisado `DMTE-37-diagnostico-e-plano-v2.md`, entregue na issue, REA do TiFlux em 15–16/10 e código do PR #69. O plano anterior permanece referência de requisitos, limites da evidência e critérios de teste.

## Decisões de implementação

- Modalidades novas: `FIXED_PROJECT` (Empreito), `MONTHLY_HOURS` (Horas Mensais + Excedente), `HOURLY` (Horas Avulsas). Tipos legados preservados para consulta, sem conversão automática nem novos lançamentos até regularização explícita.
- Contrato aprovado exige empresa, início de vigência, mesas explicitamente vinculadas à empresa e condições completas. Vínculo comercial não é substituído por mesa global nem por acesso operacional do técnico.
- Empreito tem escopo, preço fechado e estimativa total do projeto. O esforço excedente continua registrável, aumenta custo e não cria receita automaticamente. Alteração de preço exige condição/aditivo administrativo auditável. A estimativa não renova a cada mês.
- Mensal exige mensalidade, franquia e tarifa excedente explícita; zero é valor válido. Avulso exige tarifa horária com vigência, sem franquia implícita.
- Bonificação (`BONUS`) é autorizada por ADMIN e exige motivo. Garantia permanece disponível aos papéis técnicos existentes, exige motivo e vínculo. Ambas valem zero incremental, retêm custo e não consomem franquia. Nenhuma reduz automaticamente mensalidade/preço fechado.
- Custo/hora por técnico e vigência, ADMIN somente. Custo ausente é desconhecido, nunca zero presumido. Resultado é operacional estimado, não lucro líquido nem recebimento.
- Condições e custos são versões crescentes, sem sobreposição ambígua nem alteração retroativa de apontamentos. Um Worklog pode ser segmentado por ciclo e por mudança de tarifa/custo dentro do mês; minutos e centavos totais são conservados.
- Mensalidade é considerada uma vez por contrato/competência, inclusive sem Worklogs. Períodos parciais ou com mudança intramês são sinalizados como receita fixa indeterminada, sem pró-rata inventado. Empreito acumulado mostra preço uma vez; visão mensal não inventa rateio. Saldo parcial não é lucro final. Projeção final exige estimativa restante conhecida.

## Elegibilidade e integridade

Todo novo Worklog, inclusive manual/garantia/bonificação, passa pela mesma política: empresa comercial do chamado, vínculo explícito empresa–mesa, contrato da empresa aprovado/ativo, cobertura da mesa e vigência integral. Mais de um contrato elegível exige escolha. Contratos hoje encerrados não são reabertos por uma data retroativa: a primeira versão exige regularização administrativa antes do lançamento, sem exceção manual oculta.

Capturar `Ticket.commercialOrganizationId` na criação e preservar contexto; migração pode preencher chamados existentes pela organização atual do solicitante, sem alterar snapshots históricos. Na ausência de organização histórica comprovada, impedir gravação até regularização.

Ordem de travas: Ticket → Organization → Contract. Alterações dos vínculos empresa–mesa usam a mesma trava de Organization; alterações de condições usam Organization → Contract. Revalidar todas as relações dentro da transação após adquirir travas. Resposta/status e Worklog usam a mesma transação; falha comercial produz rollback integral. Notificações permanecem após commit.

Novos cronômetros exigem contrato elegível e preservam seu ID. Parada preserva tempo bruto sem exigir que o contrato continue ativo; conversão revalida e uma troca de contrato precisa de seleção explícita. Não apagar tempo bruto por suspensão de vínculo.

Snapshots preservam condições e custos efetivamente usados, organização e mesa comerciais. Histórico append-only dos vínculos empresa–mesa e IDs de mesas nas versões contratuais apoiam auditoria; histórico não é uma autorização automática para lançar retroativos.

## Permissões

ADMIN configura condições, custos e bonificações e vê resultado interno. AGENT/AGENT_MASTER continuam lançando apenas no escopo autorizado e recebem dados operacionais; nenhum custo individual, margem ou memória financeira. CLIENT_MASTER mantém apenas dados financeiros já autorizados da própria empresa, sem custo/margem interna. CLIENT não ganha permissão de apontar. Filtros de organização histórica e atual continuam protegendo relatórios existentes.

## Migração e publicação

Migração aditiva gerada por Prisma; contratos legados ficam `approved=false`, consultáveis e marcados como pendentes. O administrador escolhe modalidade, mesas e condições para regularizar. Prévia de pendências deixa claro o impacto antes da utilização. Não recalcular Worklogs existentes. O novo bloqueio vale para todos os novos lançamentos desde a publicação, conforme exigência do usuário.

Reversão deve manter o bloqueio comercial e respeitar compatibilidade dos novos enums/snapshots; se necessário suspender entrada de horas em vez de permitir lançamentos sem vínculo. Recebimentos, contas a receber, cobrança fiscal e automação de pagamentos continuam fora de escopo.

## Validação obrigatória

TDD de elegibilidade, modalidades, vigências intramês, franquia concorrente, bonificações/custos, receita fixa sem Worklogs, projeto atravessando meses, custo desconhecido, permissões e rollback. E2E real com Postgres cobre tela contrato → apontamento → relatório e chamadas diretas proibidas, timer e histórico. Rodar suíte API/web completa, lint/typecheck incluindo E2E, builds Docker e Storybook; revisão independente sem achados importantes antes de commit. Publicar PR com DMTE-37, CI/CD e verificação real em produção antes de concluir o card GitHub; Multica em revisão para aceite humano.
