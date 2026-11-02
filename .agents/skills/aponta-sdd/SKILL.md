---
name: aponta-sdd
description: Acrescentar requisitos de domínio, segurança e evidências do Aponta à SPEC original produzida por to-spec, sem criar outro método de especificação.
---

# Contexto Aponta para a SPEC

O método e template são to-spec original. Leia [references/engineering-workflow.md](references/engineering-workflow.md) para planejar a sequência grill-with-docs → to-spec → to-tickets. Este perfil acrescenta seções à mesma SPEC: AC-01 etc., perfis/tenant/RBAC, contratos reais, riscos/migração quando aplicáveis e matriz AC→teste/verificação→evidência esperada; para UI, componente/story e referência visual/fluxo confirmados. Não substituir o template Matt por outro formato nem exigir engineering-specification/engineering-alignment.

A SPEC publicada no GitHub é canônica; o arquivo docs/superpowers/specs/YYYY-MM-DD-<tema>.md espelha seu corpo para o gate local, sem outra decisão independente. Anote origem/revisão no briefing e atualize as duas representações juntas. Confirme seams de teste conforme to-spec e a divisão/dependências conforme to-tickets antes de publicar os tickets.

Leia código/contratos e docs/architecture/01-rbac-and-workflows.md e 03-sankhya-ds-parity.md do checkout. DS/tokens/Storybook existentes são contexto obrigatório de UI; referência externa requer ferramenta/acesso comprovados. Não inventar benchmark ou expor credenciais. Critério aberto volta ao humano e bloqueia a ação dependente. Um prototype em branch descartável pode esclarecer a decisão; o Architect não integra código de produto.

Tickets to-tickets são sub-issues GitHub, não filhos de etapa Multica. Ver [references/issue-tracker.md](references/issue-tracker.md). Saída e decisões ficam na atividade Architect; aponta-flow define o retorno ao líder.
