# Fluxo de entrega Aponta

## Cadência e identidade

Ciclos quinzenais com objetivo de produto, execução em Kanban e práticas XP. O primeiro ciclo é 26/10/2026–08/11/2026. Sprint não é uma única issue: agrupa entregas pequenas, priorizadas pelo responsável humano. Entregar quando pronto; revisar objetivo e impedimentos semanalmente e resultados ao final do ciclo.

GitHub registra produto; Multica registra execução. Uma entrega tem uma issue GitHub principal e um pai Multica canônico. Épicos agrupam entregas; não são executados como uma única tarefa longa. Filhos de Triagem/SPEC/Developer/QA/Delivery não geram novas issues GitHub.

O registro `.delivery/registry.json` é a identidade versionada, não uma automação bidirecional de status. A implantação verifica os vínculos reais pelos serviços autenticados; CI verifica a estrutura sem credenciais Multica. Cada PR declara exatamente `Aponta-Delivery: DMTE-N` e `Refs alfredo-maia/aponta#N`.

## Esteira

Reserve Triagem1, Architect2, Developer3, QA4 e Delivery5 em backlog antes de ativar Triagem. Tier 1 cancela Architect sem executá-lo. Em rejeição QA4, reserve Dev5/QA6, mova Delivery ainda não iniciado para7, só então ative Dev5. Stages iniciados/concluídos são preservados. O limite nativo de retomadas não deve ser aumentado ou desativado para contornar uma esteira incorreta.

Dois erros iguais de ambiente ou duas rejeições pela mesma causa exigem diagnóstico, não repetição automática. Futuras etapas ficam em backlog. Só uma entrega é liberada para implementação/revisão por vez; aumentar WIP exige isolamento e medições.

## Branch, evidências e revisão

Use branch curta e PR; uma retomada utiliza a branch já existente. Execute comandos críticos com a trava cooperativa do host:

```sh
python3 scripts/aponta_delivery.py with-lock -- python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

A trava cobre a duração do comando, não uma conversa inteira nem outros hosts. Não substitui o WIP, a separação de papéis ou o isolamento de branch.

O manifest `.delivery/deliveries/DMTE-N.json` declara identidade, ciclo, Tier, critérios e testes, SPEC quando aplicável, arquivos alterados, TDD e avaliação do DS. O SPEC associa cada AC ao teste; mudanças de escopo atualizam a especificação antes de implementar.

Capture RED antes de implementar e GREEN no mesmo comando e teste, usando uma base SHA fixa:

```sh
python3 scripts/aponta_delivery.py record --phase red --base BASE_SHA --out .delivery/evidence/DMTE-N/red.json --test-file CAMINHO_TESTE --ac AC-01 -- COMANDO_DE_TESTE
python3 scripts/aponta_delivery.py record --phase green --base BASE_SHA --out .delivery/evidence/DMTE-N/green.json --test-file CAMINHO_TESTE --ac AC-01 -- COMANDO_DE_TESTE
python3 scripts/aponta_delivery.py check --manifest .delivery/deliveries/DMTE-N.json
```

O coletor usa argv sem shell, redige valores sensíveis conhecidos do ambiente e registra horário, comando, exit code, hashes de testes/fontes/logs e ACs. O verificador rejeita erro de setup como RED, logs alterados, comando/testes divergentes, GREEN anterior ao RED e fontes alteradas depois do GREEN. Se testes/fontes mudarem, produza a evidência necessária novamente, sem reescrever o passado.

Essas evidências são verificáveis, mas não assinadas por uma autoridade independente: podem ser falsificadas por quem controla os arquivos. QA, testes CI e revisão do código continuam necessários. O collector não comprova, sozinho, intenção ou ordem histórica infalível.

Mudança sem comportamento admite TDD não aplicável com justificativa. Legados sem RED histórico ficam explicitamente pendentes de revisão de conformidade; não se inventa RED retroativo. Issues de execução antigas podem permanecer bloqueadas até nova evidência ou decisão explícita sobre a exceção.

## Design system e segurança

Architect identifica componentes existentes; Developer reutiliza DS/tokens; QA verifica estados, acessibilidade, contratos e ACs. O gate exige avaliação de DS para TSX de produto e stories para alterações no diretório DS, com exceção justificada quando realmente necessária. A análise estática não prova sozinha reuso visual ou a qualidade dos componentes; revisão e testes continuam obrigatórios.

CI constrói Storybook quando DS/configuração é afetada. Build não é teste de interação nem auditoria a11y. O runner de interação/a11y ainda precisa ser configurado e executado para que essas modalidades sejam declaradas aprovadas.

No código alterado, QA verifica autorização no backend, isolamento entre tenants e validação de entradas, além dos critérios funcionais. Testes usam dados sintéticos e banco de teste.

## Entrega e situação real

O usuário gerencia deploy. O agente de Delivery recebe o SHA aprovado, confirma o que foi realmente implantado e registra a validação; não presume que merge é produção nem altera o CD. A issue GitHub fecha após evidência de entrega, e o pai Multica é consolidado com os mesmos fatos. O uso de `Refs` evita fechamento automático no merge.

## Medição

Medir por entrega/Tier: tempo até entrega, espera, aprovação de primeira revisão, rodadas, falhas de ambiente, custo e tokens/cache por agente. O ciclo inicial é um piloto, não uma promessa de capacidade. Não equiparar redução de caracteres de skills a economia faturada.
