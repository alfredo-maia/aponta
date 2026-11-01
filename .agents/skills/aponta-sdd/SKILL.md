---
name: aponta-sdd
description: Aplicar o perfil de especificação do projeto Aponta ao método reutilizável engineering-specification para demandas Tier 2 ou 3.
---

# Perfil de especificação Aponta

Este é o contrato de projeto; o método de síntese é engineering-specification. Leia ambos e produza UM SPEC canônico. A origem deste perfil é a governança Aponta de 25/10/2026, não um rename da skill to-spec do Matt. Outros sistemas usam seus próprios perfis.

## Entradas e alinhamento

Confirme gap na implementação/testes, issue GitHub principal e pai Multica existentes. Tier 1 usa critérios claros na issue e dispensa Architect; Tier 2 pede SPEC enxuto; Tier 3 também pede fatias e dependências. Preserve exclusões e decisões anteriores. Leia o registro de alinhamento enviado no briefing; se decisão essencial estiver aberta, use engineering-alignment e retorne bloqueio ao líder. Não invente a resposta nem substitua alinhamento por uma lista extensa de histórias.

Para UI, registre referência/fluxo confirmado e estados pertinentes antes da implementação ampla. O pedido explícito do usuário pode ser a fonte; novas decisões são confirmadas pelo humano. Protótipo, quando necessário, é escrito pelo Developer em escopo isolado e respeitando WIP, não pelo Architect implementando produto.

## Saída obrigatória

Salve em docs/superpowers/specs/YYYY-MM-DD-<tema>.md, ou comentário estruturado acessível ao Developer quando não houver escrita no checkout. Reuse o SPEC existente ao retomar. Inclua:

- objetivo, comportamento atual/desejado, escopo e exclusões;
- decisões confirmadas e links para pedido/registro de alinhamento;
- critérios AC-01 etc. verificáveis, com cenários e perfis aplicáveis;
- contratos API/schema/UI reais, autorização/RBAC e separação de tenants;
- migração e riscos quando aplicáveis, ou justificativa de não aplicabilidade;
- matriz AC→teste/verificação→evidência esperada; para UI, componente/story e referência visual/fluxo;
- Tier 3: fatias verificáveis, dependências e plano de entrega ao líder.

As evidências reais e o SHA serão associados durante implementação/QA; não preencher testes futuros como executados. Mudança de escopo retorna ao Architect e atualiza este mesmo SPEC antes da ação dependente. SPEC deve preceder o commit implementador.

## Benchmark e arquitetura

Respeite docs/architecture/01-rbac-and-workflows.md e 03-sankhya-ds-parity.md conforme escopo; use DS/tokens/Storybook existentes. Paridade com referência exige benchmark autorizado e evidência real quando necessário. Nomes de variáveis de acesso do Architect são URL_TIFLUX/USER_TIFLUX/PASS_TIFLUX; conferir só presença, sem expor valores nem presumir validade/herança. Ausência de acesso é bloqueio, não benchmark inventado. Esses detalhes pertencem ao Aponta, não às skills genéricas.

## Publicação e passagem

Uma issue GitHub principal e um pai Multica por entrega, conforme .delivery/registry.json. Architect entrega SPEC/plano ao líder; não cria uma issue GitHub por fase técnica nem promove backlog sozinho. ready-for-agent não dispensa Tier/SPEC/QA. Resultado, fontes, pendências e SKILLS_LIDAS ficam na atividade; aviso mínimo no pai conforme aponta-flow. Orientações gerais estão em docs/agents/engineering-workflow.md quando presentes no checkout; se ausentes, este perfil materializado e o briefing do líder fornecem o contrato.
