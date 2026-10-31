---
name: aponta-flow
description: Coordenar ou executar uma etapa do Squad Dev Aponta na Multica, com passagem por sub-issues, stages e evidências.
---

# Esteira Aponta

O squad `9892f209-3612-411f-a5e1-708cee418bfc` é coordenado por `aponta_tech_lead`. As instruções do squad chegam ao líder; cada trabalhador precisa receber o contexto necessário na própria sub-issue.

Leia esta skill uma vez por execução. Registre seu nome no comentário de resultado. Leia apenas as skills específicas do seu papel e escopo. Os conteúdos históricos permanecem em `/home/hermes/multica/auditoria-aponta-2026-10-25/legado/`; consulte uma seção relevante quando faltar uma decisão do projeto, sem carregar a coleção inteira.

No runtime Claude deste squad, procure as skills vinculadas em `.claude/skills` relativo ao cwd real da tarefa; use Skill pelo nome ou leia esse arquivo local. Se o diretório/nome esperado não existir, confira o catálogo do Multica e a alocação da tarefa e registre dependência ausente como bloqueio. Não substitua essa conferência por `find /`, busca em outros projetos ou loop de procura no filesystem.

## Passagem

- Política aprovada v4: uma issue GitHub principal e um pai Multica por entrega, registrados em `.delivery/registry.json`. Épicos são agrupadores, sem execução automática. Sub-issues técnicas herdam o vínculo e o ciclo do pai. Não duplicar issues nem confundir números dos dois sistemas.
- Ciclo inicial: 26/10–08/11/2026, Kanban com WIP 1 e práticas XP. Prioridade humana e bloqueios/adiamentos existentes prevalecem; não promover toda a quinzena de uma vez.
- Desenvolvimento usa branch curta + PR com `Aponta-Delivery: DMTE-N` e `Refs alfredo-maia/aponta#N`. Merge não é entrega; não usar fechamento automático. O usuário cuida do deploy.

- Issue pai atribuída ao squad; sub-issue atribuída ao agente específico. Verifique o contexto atual antes de criar uma issue pai, evitando duplicá-la.
- Planeje a esteira antes de ativá-la: Triagem 1, Architect 2, Developer 3, QA 4 e Delivery 5, inicialmente todos em backlog; só então libere Triagem. Etapas futuras ficam em backlog e só o líder promove a próxima. Tier 1 cancela o Architect ainda não iniciado, com motivo explícito.
- Stages de etapas iniciadas ou concluídas não são reutilizados. Para corrigir QA, insira Developer e novo QA antes do Delivery ainda em backlog: após QA stage S, crie correção S+1 em backlog e novo QA S+2 em backlog, mova o Delivery pendente para S+3, só então libere a correção. Apenas etapas futuras nunca iniciadas podem ser renumeradas.
- O stage é uma barreira de conclusão, não um bloqueio automático de execução. Crie as reservas antes de iniciar workers; uma etapa futura ativa pode começar antes da hora.
- `done` e `cancelled` são resultados distintos: cancelamento exige decisão do líder, nunca aprovação implícita. A barreira pode retomar o pai, mas não substitui a devolução explícita do contexto.
- Para TODO resultado terminal, registrar resultado/evidências no filho e aplicar status correto; depois UMA notificação mínima no pai, conforme a regra abaixo. No Aponta o comentário simples no pai abre leader_task, sem @nome/mention:// nem wakeup duplicado. O líder lê o resultado na origem antes de avançar.
- BLOQUEADO exige causa, pergunta, responsável e evento de retomada registrados no filho; o aviso no pai é mínimo com link; manter pai `blocked` e não promover próxima fase. O líder confirma filho/status/evidência e deduplica por filho+rodada+resultado antes de avançar. Após complemento suficiente, reativar a mesma fase e, após blocked→todo, conferir runs; sem execução nova queued/running, chamar `multica issue rerun <UUID_DO_FILHO>`. Não esperar evento não registrado.
- QA rejeitado encerra sua rodada com `REJEITADO` e achados; o líder cria nova correção e nova revisão. Bloqueio por falta de requisito mantém a etapa aberta, com pergunta e responsável pela resposta.
- O líder lê o veredito, confere sub-issues existentes e evita duplicar a próxima etapa em retomadas repetidas. Não cria polling, cron ou wakeups para aguardar workers; usa os eventos nativos.
- A plataforma limita a 12 retomadas de uma regra por hora. Criar só um filho por vez alterna `all` e `stage:N` e pode duplicar retomadas até pausar a esteira. Preserve as reservas futuras; não aumente nem desative a proteção para contornar o problema.

## Estado e memória

Contrato vigente v5 (26/10/2026). PR #108 integrado na main; conferir a política no checkout em uso. Não confundir integração com implantação em produção. Chamadas MCP estáticas de memória usam workspace=default e project=alfredo-maia-aponta; captura depende de marcador/hooks verificados, não apenas de vínculo. Não sobrescrever escopo alheio ou afirmar persistência sem evidência.

## Resultado compacto

No comentário final da própria atividade do especialista informe: `RESULTADO`, `TIER`, `RODADA`, `SKILLS_LIDAS`, artefato/SHA, comandos executados com resultado, critérios cobertos, pendências e próximo responsável. Diferencie execução observada de recomendação e de teste não executado. Use links e resumos; logs completos ficam em arquivos/artefatos. O líder mantém na descrição do pai a tabela Próximos passos com nomes canônicos em texto e links reais das fases, sem menções ativas a toda a equipe. Meta de até 250 palavras, ampliável se houver achado que exija explicação.

## Modos

Em produção, entrega concluída exige SHA aprovado pelo QA, CI desse SHA e smoke test real. Uma rodada de QA não aprova commits futuros. O líder mantém a issue pai em andamento até a entrega; só altera seu status se a issue estiver atribuída ao próprio squad.

QA executa o verificador do manifest e relata resultado geral e SHA exato. O líder publica o check `Independent QA` somente a partir de evidência atribuível do agente QA, usando `/home/hermes/multica/implantacao-fluxo-2026-10-25/publicar_qa.py --delivery <chave> --sha <sha40> --qa-issue <uuid> --registry <checkout>/.delivery/registry.json`. Ausência de aprovação não deve ser contornada publicando status manualmente. Novos commits exigem nova revisão.

Se a issue pai declarar `MODO=VALIDACAO_ESTEIRA`, execute somente o roteiro local de validação indicado nela, propagando-o integralmente às sub-issues. Não toque no repositório real, GitHub, produção ou sistemas de terceiros. Entrega nesse modo é simulação explícita e não comprova deploy real.

## Retorno mínimo ao coordenador — 27/10/2026

Esta regra substitui a devolução detalhada no pai. Resultado, causa, perguntas, evidências, logs, SHA/artefato, limitações e SKILLS_LIDAS ficam na própria atividade do especialista. Publicar esse registro antes de atualizar o status e notificar o coordenador.

O aviso ao Tech Lead/coordenador tem uma única frase: “Atividade [DMTE-N](URL_REAL) concluída.” Para impedimento: “Atividade [DMTE-N](URL_REAL) bloqueada.” Concluída significa rodada encerrada, inclusive se REJEITADO; nunca comunicar bloqueio como conclusão ou inferir aprovação de done. Não incluir diagnóstico, veredito, causa, perguntas, evidências, listas ou resumo técnico nesse aviso.

Manter o mecanismo de acionamento vigente (comentário simples/barreira/menção exigida pelo fluxo), sem adicionar outro disparo. No máximo um aviso por atividade+rodada+resultado. O líder abre o link e confere resultado, status e evidências antes de decidir; o aviso não autoriza avanço.

O líder comenta somente decisão nova e próxima ação, com link à origem; não copia o relatório do especialista nem repete perguntas já registradas. A tabela de acompanhamento fica atualizada na descrição do pai; no comentário, citar apenas fases alteradas. Se especialista e líder atuarem na mesma issue sem filho, manter o registro técnico uma única vez e o líder acrescenta somente sua decisão; não criar um segundo aviso para a mesma issue.

## Métodos e contrato de entendimento — 31/10/2026

Classifique Tier por escopo, impacto e risco: Tier1 é correção/texto simples; Tier2 é melhoria contida de UI/API/fluxo; Tier3 é mudança grande/estrutural. UI por si só não determina Tier3.

Triagem usa engineering-triage; Triagem/Architect usam engineering-alignment quando faltar decisão de produto/UI. Architect usa engineering-specification com o perfil aponta-sdd para um único SPEC. A skill triage original não atribui investigação ao líder. Métodos genéricos não concedem autorização para publicar/fechar issues ou promover fases.

O briefing da próxima fase contém links reais para pedido, registro de alinhamento, decisões humanas confirmadas, cenários, exclusões, referência visual/fluxo e SPEC vigente. A próxima fase abre essas fontes; sessões dos agentes não compartilham automaticamente a conversa. Decisão explícita já existente não precisa de nova aprovação; decisão essencial aberta bloqueia somente a ação dependente. Aceite de produto/visual e QA técnico são verificações distintas.

Alinhamento: confirme resultado desejado por exemplos/fluxo antes de implementar mudanças ambíguas. Divergência dentro do escopo volta à fase responsável na mesma entrega, sem nova issue GitHub automática; mudança real de escopo depende de decisão humana. UI segue DS/Storybook; design-taste preserva identidade existente, Emil refina dentro do recorte. Build/screenshot isolados não provam intenção atendida.

Passagem normal usa resultado na atividade e aviso mínimo no pai; ai-memory mantém conhecimento no escopo correto. Não criar handoff de memória a cada stage. Handoff explícito de sessão usa o mecanismo existente ai-memory; arquivo portátil só quando houver destinatário sem acesso, referenciando fontes canônicas. Não adicionar wakeups paralelos.
