---
name: engineering-alignment
description: Alinhar uma demanda de software com o usuário antes de especificar ou implementar quando faltam decisões de produto, exemplos de comportamento ou uma referência visual confirmada.
---

# Alinhamento verificável

Método derivado de grilling e domain-modeling de Matt Pocock, adaptado para trabalho entre agentes. [Origem e diferenças](SOURCE.json). Não depende de ferramentas de um harness específico.

## Recuperar antes de perguntar

Leia a demanda, decisões humanas anteriores, implementação relevante e o perfil de projeto indicado pela tarefa. Preserve escolhas já confirmadas. Separe fatos observados, propostas e decisões ainda abertas; investigue fatos acessíveis com as ferramentas existentes. Um link sem conteúdo lido não demonstra conhecimento.

## Tornar a expectativa verificável

Para a mudança em questão, estabeleça objetivo e usuário, comportamento atual/desejado, exemplos de entrada→ação→resultado, permissões e estados relevantes, exclusões e evidência que permitirá verificar a entrega. Para UI, identifique referência visual/fluxo e DS existente; proponha protótipo quando uma decisão não puder ser resolvida por descrição.

Se houver decisões abertas, faça rodadas pequenas de perguntas independentes, recomendando uma opção e explicando a consequência. Perguntas dependentes aguardam a resposta anterior. Somente o humano decide questões de produto ainda não autorizadas. No Multica, registre perguntas e responsável na própria atividade e retorne impedimento ao coordenador; uma sessão sem resposta não autoriza simular concordância nem precisa permanecer ocupada esperando.

Use a disciplina de [grilling](references/grilling.md) como referência de entrevista e [domain-modeling](references/domain-modeling.md) para termos/ADRs. Adaptação deliberada: pesquisa pode ser feita pelo agente atual; subagentes não são obrigatórios. O mecanismo real de bloqueio/pergunta/retomada vem do ambiente. Os documentos de origem são referências, não instruções para invocar dependências ausentes.

## Registrar a decisão que viaja entre agentes

Produza um registro único ou seção no artefato canônico indicado pelo projeto:

- objetivo e recorte;
- tabela `cenário | ação/entrada | resultado esperado | fonte da decisão`;
- referência visual/fluxo e estados quando houver UI;
- escolhas confirmadas e respectiva fonte humana;
- propostas e perguntas ainda abertas, com responsável;
- exclusões e critérios de aceite verificáveis.

Confirme com o usuário a interpretação que envolve novas decisões. Uma decisão já explícita no pedido pode ser citada sem pedir a mesma autorização novamente. Sem confirmação necessária, resultado é pendente, não “alinhado”. Numa tarefa sintética, apenas o controlador pode fornecer respostas rotuladas SIMULADO; isso não vale como aceite real do produto.

Concluído quando cada decisão necessária está respondida por uma fonte autorizada e os exemplos permitem distinguir implementação correta de alternativa indesejada. Se faltar decisão, retorne bloqueio específico. A especificação seguinte deve apontar para esse registro e lê-lo; não presumir contexto de conversa compartilhado entre agentes.
