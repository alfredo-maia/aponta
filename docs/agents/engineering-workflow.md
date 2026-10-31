# Engenharia no Multica

Métodos reutilizáveis e perfil do projeto têm responsabilidades diferentes. As skills `engineering-alignment`, `engineering-triage` e `engineering-specification` derivam de Matt Pocock e registram revisão/diferenças em seus SOURCE.json. Seus arquivos auxiliares viajam no mesmo bundle. Skills originais são mantidas para referência, sem alteração silenciosa do upstream.

## Fluxo e responsáveis

O Tech Lead coordena e preserva o vínculo GitHub↔Multica; a Triagem confirma gap/Tier/ACs e identifica ambiguidade. Triagem e Architect usam engineering-alignment quando uma decisão de produto/UI está aberta. O Architect sintetiza o único SPEC com engineering-specification e o perfil aponta-sdd. Tier 1 claro dispensa Architect e entrevista completa.

O brief de uma fase carrega links reais para pedido, decisões humanas, cenários confirmados, referência visual/fluxo, exclusões e SPEC vigente. O próximo agente abre as fontes antes de agir. Contexto de conversa não é automaticamente compartilhado pelo squad. Em checkout que ainda não contém estes docs, o líder fornece o perfil vigente no briefing; ausência não autoriza inventar a configuração.

O Developer implementa somente o recorte autorizado. O QA relaciona a entrega ao entendimento confirmado e ao SPEC, além de reproduzir os gates do SHA. Novas decisões de escopo voltam ao humano; defeitos dentro do recorte geram a rodada corretiva prevista, sem abrir automaticamente outra issue de produto.

## Contrato Aponta

`docs/delivery/WORKFLOW.md` e AGENTS.md continuam definindo identidade, WIP, gates e entrega. O perfil `aponta-sdd` inclui objetivo, atual/desejado, escopo/exclusões, ACs numerados, contratos, segurança/tenant, riscos/migração quando aplicáveis, matriz AC→teste→evidência e referência visual para UI. Tier 3 inclui fatias e dependências. SPEC não é sinônimo de uma segunda issue GitHub.

O aceite de direção/fluxo registra fonte humana e cenários verificáveis; o agente pode citar uma decisão já explícita sem pedir autorização novamente. Sem resposta, bloqueia apenas a ação dependente. Protótipo exploratório é evidência para uma decisão, não implementação aprovada.

## Design

1. Conferir cenário e referência/fluxo aceitos e componentes/tokens do DS.
2. Usar direção visual adicional somente quando faz parte do escopo; design-taste preserva identidade existente, emil-design-eng refina dentro dela.
3. Verificar comportamento/estados, responsividade e acessibilidade pertinente; usar Storybook conforme aponta-storybook.
4. Comparação visual exige baseline aprovada. Captura de tela ou build verde isolados não provam que a experiência é a pretendida. A revisão e a evidência devem corresponder ao SHA entregue.

## Conhecimento e passagem de fase

Multica mantém estado, atribuição e evidência da fase. ai-memory guarda/recupera conhecimento no escopo correto; presença do MCP não prova captura nem recuperação. Dentro da esteira, resultado no filho + aviso mínimo no pai continuam o mecanismo de passagem. Não criar handoff de memória a cada stage nem wakeups extras. Handoff explícito de sessão usa o mecanismo existente ai-memory; arquivo portátil é reservado a destinatário sem esse acesso e aponta para as mesmas fontes.

## Invocação e distribuição

O Multica entrega as skills vinculadas e seus supporting files ao runtime Claude. Os três métodos adaptados são descobertos automaticamente e não dependem de slash commands manuais ou de skills ausentes. Os originais com disable-model-invocation continuam preservados; não presumir que vincular o original o torne invocável pelo modelo. Deltas de método estão nas adaptações, não no upstream.

Nos agentes Claude deste squad, o primeiro caminho é `.claude/skills` relativo ao cwd da tarefa. Usar a ferramenta Skill ou leitura local do bundle; nome ausente exige conferir catálogo/alocação e bloquear de forma explícita. Varrer `/` ou diretórios de outros projetos não é estratégia de descoberta de dependências.

`python3 scripts/check_engineering_skills.py` verifica referências/scripts dos métodos reutilizáveis e hashes de origem declarados em SOURCE.json. Perfis `aponta-*` podem apontar a ferramentas do repositório e são conferidos com o contrato do checkout e a implantação do Multica; não são classificados como bundles genéricos autossuficientes por esse comando. O check de entrega executa o verificador e seus testes de regressão. Conferir o banco continua necessário para demonstrar que os mesmos arquivos foram publicados no Multica.

Este arquivo não concede autorização de merge/CD/deploy. `pr` complementa o template de PR mantendo Aponta-Delivery e Refs. `retro` é uma operação solicitada de revisão de fontes, não alteração automática da governança; writing-for-agents é sua referência de manutenção.
