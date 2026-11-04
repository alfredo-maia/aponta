---
name: aponta-flow
description: Coordenar ou executar o fluxo Matt original no Squad Dev Aponta, com papéis, etapas por menção e evidências próprios do Multica.
---

# Fluxo Aponta

Leia [references/engineering-workflow.md](references/engineering-workflow.md) antes de planejar ou executar uma fase. Esse contrato define a composição dos métodos originais, os papéis e as exceções explícitas de projeto. O mapa de métodos e arquivos originais está em [references/matt-workflow.json](references/matt-workflow.json).

## Orquestração Multica

Squad Dev Aponta 9892f209-3612-411f-a5e1-708cee418bfc, líder dev_tech_lead; Squad Rápido 07ed3021-160a-46aa-a52c-eeca3b20b849, líder rapido_tech_lead, que acumula Triagem e Architect, com rapido_dev como Developer e rapido_qa acumulando QA e Delivery; Squad Ultra Rápido 56e14177-9bb3-4547-af91-419edd3df4db, líder ultra_rapido, que acumula Triagem, Architect, Developer e Delivery, com ultra_qa só na revisão independente (ver docs/delivery/WORKFLOW.md). Delegue cada etapa por menção no pai canônico, uma por vez: Triagem → Architect → Developer → QA → Delivery. Entrada já planejada não ganha nova triagem; registre no pai a etapa dispensada e o motivo. Funcionalidade nova/grande refatoração exige planejamento completo no Architect. Só o líder promove fases elegíveis e confere fontes/artefatos antes da implementação.

Ciclo é automático: ao iniciar a entrega, registre no `.delivery/registry.json` o valor de `python3 scripts/aponta_delivery.py cycle`, sem perguntar ao humano e sem bloquear etapa por isso. A entrega mantém o ciclo de início se terminar no seguinte. Mudança no registro segue a branch e o PR da própria entrega.

No resultado do especialista registre RESULTADO=APROVADO|REJEITADO|BLOQUEADO, TIER, RODADA, SKILLS_LIDAS, método de carregamento/invocação, fontes/decisões, SPEC/tickets, base/SHA, comandos e evidências, pendências e próximo responsável. Leitura não prova invocação por Skill; teste não executado é declarado. Uma única linha RESULTADO por comentário. BLOQUEADO identifica pergunta, responsável e evento de retomada. O especialista responde no fio da menção e não altera o status do pai.

O resultado completo fica na resposta do especialista no fio, sem aviso extra nem nova menção ao líder: a resposta já o acorda. O líder lê o fio inteiro, usa o último resultado do responsável e deduplica etapa+rodada+resultado; status não equivale a aprovação. Mantenha no pai a tabela Próximos passos com links e responsáveis em texto.

Bloqueio suspende as promoções dependentes, e o líder pode pôr o pai em blocked enquanto espera o humano. Complemento suficiente volta ao mesmo responsável numa nova menção no fio; confira runs e não abra outra execução se já há uma queued/running. Não criar polling nem contornar o limite nativo 12 retomadas/hora. Após duas rejeições pela mesma causa ou dois erros idênticos de ambiente, devolver diagnóstico/decisão.

QA rejeitado exige nova correção e novo QA: uma menção ao Developer e, depois do novo SHA, uma menção ao QA. QA nunca corrige o próprio achado.

Independent QA é publicado somente pelo verificador atribuível `scripts/publicar_qa.py` do checkout, com delivery e SHA40. Não criar status manual/sintético. Novo SHA exige nova revisão. O usuário gerencia merge/deploy; não acionar CD/produção. Entrega, merge e aceite são fatos distintos.

MODO=VALIDACAO_ESTEIRA executa exclusivamente o roteiro sintético explícito, com SIMULADO, sem produto/GitHub/produção ou QA fictício. Configuração de skills não autoriza retomar tarefas canceladas nem disparar um ensaio. Preservar decisões/bloqueios existentes.
