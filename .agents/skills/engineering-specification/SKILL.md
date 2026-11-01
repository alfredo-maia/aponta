---
name: engineering-specification
description: Sintetizar decisões confirmadas em um único SPEC de software e decompor entregas quando necessário, usando o contrato de qualidade e o tracker do projeto.
---

# Especificação por contrato de projeto

Adaptação reutilizável de to-spec/to-tickets de Matt Pocock. [Origem e diferenças](SOURCE.json). O método é genérico; stack, DS, Tier, autorização, caminhos e tracker são definidos no perfil do projeto, nunca inferidos de outro sistema.

## Entrada

Leia o registro de alinhamento e suas fontes, a issue canônica, código/testes pertinentes e o perfil recebido. Reutilize SPEC existente quando retomar. Se uma decisão essencial não foi confirmada, registre a lacuna e retorne ao alinhamento; não complete requisitos por suposição nem faça nova entrevista duplicando respostas já registradas.

O perfil define quais campos e gates são obrigatórios e onde publicar. Ausência de perfil em trabalho novo exige explicitar esses limites antes de publicar, sem assumir Aponta ou criar tracker alternativo. No Aponta, leia aponta-sdd e os docs/agents do checkout ou o perfil completo fornecido pelo coordenador.

## SPEC único

Use [to-spec](references/to-spec.md) como referência de síntese e escreva um único artefato canônico com:

- problema e resultado desejado para o usuário;
- escopo, exclusões e decisões confirmadas com fonte;
- cenários/critério identificados (`AC-01` etc.), incluindo estados e perfis pertinentes;
- contratos afetados e decisões técnicas necessárias, respeitando arquitetura/ADRs;
- segurança/autorização, dados/migração e riscos conforme aplicabilidade;
- como cada AC será verificado, incluindo referência visual aprovada quando houver UI;
- pendências explícitas, fontes do alinhamento e localização canônica.

Adaptações deliberadas ao original: histórias são proporcionais ao escopo; não gerar uma lista extensa por obrigação; destino, publicação e labels vêm do perfil; requisitos de qualidade complementam o template Matt. Não produzir dois SPECs para satisfazer formatos diferentes. Testes devem exercitar comportamento que o usuário confirmou, não apenas a solução escolhida pelo agente.

Concluído quando decisões essenciais têm fonte, critérios são verificáveis e todos os campos exigidos pelo perfil foram cobertos ou justificados como não aplicáveis. O SPEC precede a implementação; mudança de escopo atualiza o mesmo registro antes da ação dependente.

## Decompor somente quando agrega valor

Use [to-tickets](references/to-tickets.md) para fatias verificáveis e dependências, preservando expand–contract quando uma refatoração ampla exigir. Cada fatia deve permitir uma demonstração/teste e ter ACs. Não criar uma issue de produto por camada técnica ou por rodada de QA.

Proponha a decomposição antes da publicação e respeite escolhas já autorizadas. O perfil define o tracker e o coordenador que publica/promove fases. Dependência concluída não concede permissão de ativar outra etapa. No Aponta, o Architect entrega SPEC/plano ao líder; fases técnicas ficam no Multica, mantendo o par de identidade existente. Um label ready-for-agent não substitui os gates do projeto.
