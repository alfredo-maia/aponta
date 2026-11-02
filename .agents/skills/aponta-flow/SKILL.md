---
name: aponta-flow
description: Coordenar ou executar o fluxo Matt original no Squad Dev Aponta, com papéis, stages e evidências próprios do Multica.
---

# Fluxo Aponta

Leia [references/engineering-workflow.md](references/engineering-workflow.md) antes de planejar ou executar uma fase. Esse contrato define a composição dos métodos originais, os papéis e as exceções explícitas de projeto. O mapa de métodos e arquivos originais está em [references/matt-workflow.json](references/matt-workflow.json).

## Orquestração Multica

Squad 9892f209-3612-411f-a5e1-708cee418bfc; líder dev_tech_lead. Reserve Triagem1, Architect2, Developer3, QA4 e Delivery5 em backlog antes de ativar workers. Entrada já planejada não ganha nova triagem; cancele a reserva dispensada com justificativa. Funcionalidade nova/grande refatoração exige planejamento completo no Architect. Só o líder promove fases elegíveis e confere fontes/artefatos antes da implementação.

No resultado do especialista registre RESULTADO=APROVADO|REJEITADO|BLOQUEADO, TIER, RODADA, SKILLS_LIDAS, método de carregamento/invocação, fontes/decisões, SPEC/tickets, base/SHA, comandos e evidências, pendências e próximo responsável. Leitura não prova invocação por Skill; teste não executado é declarado. APROVADO/REJEITADO encerram a rodada done; BLOQUEADO mantém blocked e identifica pergunta, responsável e evento de retomada.

Após resultado/status, publique apenas um aviso mínimo no pai: “Atividade [DMTE-N](URL_REAL) concluída.” ou “Atividade [DMTE-N](URL_REAL) bloqueada.” Sem @nome, mention:// ou wakeup adicional. O líder abre a fonte e deduplica filho+rodada+resultado; done/cancelled não equivalem a aprovação. Mantenha no pai a tabela Próximos passos com links e responsáveis em texto.

Bloqueio mantém pai blocked e suspende promoções dependentes. Complemento suficiente reativa a mesma fase; após blocked→todo confira runs e use multica issue rerun <UUID> apenas se não há execução queued/running. Não criar polling nem contornar o limite nativo 12 retomadas/hora. Após duas rejeições pela mesma causa ou dois erros idênticos de ambiente, devolver diagnóstico/decisão.

QA rejeitado exige nova correção e novo QA; após stage S reserve Developer S+1 e QA S+2, mova Delivery ainda não iniciado para S+3, então libere correção. Stages iniciados/concluídos são preservados. QA nunca corrige o próprio achado.

Independent QA é publicado somente pelo verificador atribuível /home/hermes/multica/implantacao-fluxo-2026-10-25/publicar_qa.py com delivery, SHA40, issue QA e registry do checkout. Não criar status manual/sintético. Novo SHA exige nova revisão. O usuário gerencia merge/deploy; não acionar CD/produção. Entrega, merge e aceite são fatos distintos.

MODO=VALIDACAO_ESTEIRA executa exclusivamente o roteiro sintético explícito, com SIMULADO, sem produto/GitHub/produção ou QA fictício. Configuração de skills não autoriza retomar tarefas canceladas nem disparar um ensaio. Preservar decisões/bloqueios existentes.
