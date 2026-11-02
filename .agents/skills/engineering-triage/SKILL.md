---
name: engineering-triage
description: Investigar uma demanda de software recebida, confirmar gap e evidências, classificar risco pelo perfil do projeto e produzir um brief pronto para alinhamento ou especificação.
---

# Triagem de engenharia

Adaptação de triage de Matt Pocock para execução por um especialista e devolução ao coordenador. [Origem e diferenças](SOURCE.json). Consulte o [método original](references/triage.md) e o [brief](references/AGENT-BRIEF.md) quando precisar de sua estrutura; publicação, estados e papéis seguem o perfil recebido.

1. Leia a demanda e comentários anteriores, vínculo canônico e decisões de produto. Procure implementação existente e solicitações equivalentes por conceito. Confira rejeições anteriores documentadas sem restaurar decisões superadas.
2. Para bug, busque reprodução específica e registre comando/resultado. Não conseguir reproduzir é informação insuficiente ou bloqueio, não prova de ausência do defeito. Esta fase não implementa a correção.
3. Classifique natureza, risco/Tier quando o projeto tiver essa política, escopo, ACs, dependências e o que ainda precisa de decisão. Use evidência para separar código ausente, comportamento diferente, problema de ambiente e expectativa ambígua.
4. Quando faltar entendimento do resultado desejado, use engineering-alignment. Para demanda já clara e confirmada, cite a fonte e evite outra entrevista. Uma expectativa contestada não vira fato porque consta em um rascunho de SPEC.
5. Entregue brief no registro canônico: gap/evidência, escopo, ACs, classificação justificada, decisões confirmadas e pendentes, fontes e próximo responsável recomendado. Deixe decisão de produto aberta para o humano e decisão de promoção para o coordenador.

Adaptações deliberadas: não fechar/reabrir issues, publicar labels/novas issues ou ativar implementação como efeito implícito de classificar. O perfil e o escopo autorizado controlam essas ações. No Aponta, preservar uma issue GitHub principal e um pai Multica por entrega; Tier 1 usa critérios suficientes e Tier 2/3 requer SPEC. A Triagem não absorve Architect, Developer ou QA.

Concluído quando o gap e a classificação estão sustentados e os requisitos essenciais estão claros. Se faltar dado necessário, devolver impedimento com pergunta, fonte consultada, responsável e evento de retomada. “Pronto” no brief não é aprovação de código nem aceite de produto. Os arquivos de origem preservam a proveniência; chamadas originais a grilling/domain-modeling são resolvidas pelo método adaptado engineering-alignment, não por dependências implícitas.
