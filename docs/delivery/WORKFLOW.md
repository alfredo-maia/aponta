# Fluxo de entrega Aponta

## Cadência e identidade

Ciclos quinzenais automáticos, execução em Kanban e práticas XP. Os ciclos são janelas de 14 dias contadas a partir de 26/10/2026 (26/10–08/11, 09/11–22/11 e assim por diante), sem cadastro manual: `python3 scripts/aponta_delivery.py cycle [--date AAAA-MM-DD]` devolve o id `início/fim`, e o verificador rejeita no registro qualquer ciclo fora dessa cadência. Sprint não é uma única issue: agrupa entregas pequenas, priorizadas pelo responsável humano. Entregar quando pronto; revisar objetivo e impedimentos semanalmente e resultados ao final do ciclo.

O ciclo é rótulo de planejamento, não prazo nem portão. Quem coordena registra o ciclo vigente quando a entrega entra na esteira, sem perguntar ao humano, e a entrega mantém esse ciclo se terminar no seguinte. Entrada ainda não iniciada fica com `cycle: null`. Nenhuma etapa espera decisão de ciclo; adiar ou priorizar uma entrega é decisão humana sobre a fila, não sobre o ciclo. O WIP de uma entrega em implementação/revisão conta até o merge; entrega mergeada aguardando aceite não ocupa a vaga.

GitHub registra produto; Multica registra execução. Uma entrega tem uma issue GitHub principal e um pai Multica canônico. Épicos agrupam entregas; não são executados como uma única tarefa longa. As etapas de Triagem/Architect/Developer/QA/Delivery são delegadas por menção no pai Multica canônico e não geram issues GitHub nem issues Multica por fase. Tickets de implementação produzidos por to-tickets são sub-issues GitHub da SPEC e herdam a identidade da entrega, conforme docs/agents/issue-tracker.md.

O registro `.delivery/registry.json` é a identidade versionada, não uma automação bidirecional de status. A implantação verifica os vínculos reais pelos serviços autenticados; CI verifica a estrutura sem credenciais Multica. Cada PR declara exatamente `Aponta-Delivery: DMTE-N` e `Refs alfredo-maia/aponta#N`.

## Esteira

O líder delega cada etapa por menção no pai canônico, uma por vez, na ordem Triagem → Architect → Developer → QA → Delivery, com o briefing no comentário. O responsável responde no fio da menção e não altera o status do pai; só o líder muda esse status, e o pai vai para revisão depois que o Delivery verificou a entrega. Bug pequeno Tier 1 com critérios confirmados pode dispensar o Architect, com o motivo registrado no pai. Funcionalidade nova/grande refatoração executa grill-with-docs → to-spec → to-tickets no Architect, independentemente do Tier. Rejeição do QA gera uma nova menção ao Developer para a correção e, depois, uma nova menção ao QA para o novo SHA. Issue filha só é usada quando há trabalho em paralelo que não cabe num único fio. O limite nativo de retomadas não deve ser aumentado ou desativado para contornar uma esteira incorreta.

O Squad Rápido executa a mesma esteira com três agentes, sem remover etapa nem evidência: o líder `dev_rapido_lider` acumula coordenação, Triagem e Architect; `dev_rapido_executor` é o Developer; `dev_rapido_qa` acumula QA e Delivery. Triagem e planejamento rodam na execução do líder, que publica no pai o resultado de cada etapa num comentário próprio, com a linha `RESULTADO=`, e segue sem menção a si mesmo; despachos e conferências do líder não levam `RESULTADO=`. Developer e QA/Delivery continuam por menção no pai. Defeito que o líder reproduz ao conferir a implementação volta ao Developer antes do QA, com a reprodução registrada no pai; suspeita não reproduzida fica no pai como pendência e recebe veredito do QA. O QA continua obrigatório no SHA final. Os limites de cada papel não mudam: o líder não implementa nem revisa, o Developer não aprova, e o `dev_rapido_qa` nunca revisa trabalho próprio. Depois do próprio `RESULTADO=APROVADO`, o `dev_rapido_qa` publica o Independent QA e segue para a entrega na mesma execução; a espera pelo merge é um segundo comentário, `RESULTADO=BLOQUEADO`, e a verificação pós-merge é uma nova menção a ele. O Squad Dev Aponta continua válido com os seis agentes.

O Squad Ultra Rápido executa a mesma esteira com dois agentes: `dev_ultra_lider` acumula coordenação, Triagem, Architect, Developer e Delivery; `dev_ultra_qa` faz só a revisão independente. Cada etapa do `dev_ultra_lider` fecha num comentário próprio no pai com uma linha `ETAPA=` (`TRIAGEM`, `PLANEJAMENTO`, `IMPLEMENTACAO` ou `ENTREGA`) e uma `RESULTADO=`; a implementação aprovada exige o code-review do método na mesma rodada. A execução do líder só para por decisão ou passo humano ou para a revisão: o SHA final vai ao `dev_ultra_qa` por menção no pai. O `dev_ultra_qa` nunca revisa trabalho próprio; depois do próprio `RESULTADO=APROVADO`, publica o Independent QA na mesma execução, e o `dev_ultra_lider` faz a entrega, que espera o merge humano com `RESULTADO=BLOQUEADO`. Correção pedida pelo QA volta ao `dev_ultra_lider` e passa por um novo QA.

Dois erros iguais de ambiente ou duas rejeições pela mesma causa exigem diagnóstico, não repetição automática. Etapas futuras não são despachadas antes da hora. Só uma entrega é liberada para implementação/revisão por vez; implement-spec pode coordenar até dois tickets liberados dentro dessa mesma entrega, em worktrees/branches novos e exclusivos, com um único coordenador e integração. Aumentar o número de entregas concorrentes exige isolamento e medições.

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

Com a proteção `strict` da `main`, o PR precisa conter a `main` atual, e a base da entrega anda. O RED/GREEN gravado numa base mais antiga continua válido quando essa base é ancestral do `base_sha` do manifest e nenhum arquivo alterado ou testado pela entrega mudou entre as duas bases. Arquivos apagados ou renomeados pela entrega contam como alterados. Se a `main` tocou um desses arquivos, o RED perde a validade e a entrega volta ao QA com evidência nova. Depois de atualizar a branch, atualize o `base_sha` do manifest e regrave o GREEN: o hash de fontes do GREEN é medido contra o `base_sha`, então muda quando ele muda. O QA revisa o SHA novo. `python3 scripts/atualizar_entrega.py DMTE-N` faz esses passos (merge da `main`, `base_sha`, GREEN, verificador, commit) e desfaz o que fez se algo falhar (sem `reset --hard`, preservando edições feitas durante a execução); ele não faz push.

O coletor usa argv sem shell, redige valores sensíveis conhecidos do ambiente e registra horário, comando, exit code, hashes de testes/fontes/logs e ACs. O verificador rejeita erro de setup como RED, logs alterados, comando/testes divergentes, GREEN anterior ao RED e fontes alteradas depois do GREEN. Se testes/fontes mudarem, produza a evidência necessária novamente, sem reescrever o passado.

Essas evidências são verificáveis, mas não assinadas por uma autoridade independente: podem ser falsificadas por quem controla os arquivos. QA, testes CI e revisão do código continuam necessários. O collector não comprova, sozinho, intenção ou ordem histórica infalível.

QA confere a ordem no histórico da execução do Developer no Multica (`multica issue run-messages`): o teste novo falhou por asserção antes da implementação. RED obtido removendo, quebrando ou revertendo código pronto é evidência fabricada e reprova a conformidade de TDD, mesmo com o verificador aceitando.

Mudança sem comportamento admite TDD não aplicável com justificativa. Legados sem RED histórico ficam explicitamente pendentes de revisão de conformidade; não se inventa RED retroativo. Issues de execução antigas podem permanecer bloqueadas até nova evidência ou decisão explícita sobre a exceção.

## Design system e segurança

Architect identifica componentes existentes; Developer reutiliza DS/tokens; QA verifica estados, acessibilidade, contratos e ACs. O gate exige avaliação de DS para TSX de produto e stories para alterações no diretório DS, com exceção justificada quando realmente necessária. A análise estática não prova sozinha reuso visual ou a qualidade dos componentes; revisão e testes continuam obrigatórios.

CI constrói Storybook quando DS/configuração é afetada. Build não é teste de interação nem auditoria a11y. O runner de interação/a11y ainda precisa ser configurado e executado para que essas modalidades sejam declaradas aprovadas.

No código alterado, QA verifica autorização no backend, isolamento entre tenants e validação de entradas, além dos critérios funcionais. Testes usam dados sintéticos e banco de teste.

## Independent QA

`Independent QA` é check obrigatório da main. Só o verificador atribuível do host o publica:

```sh
python3 scripts/publicar_qa.py --delivery DMTE-N --sha SHA40
```

Ele lê o pai canônico do `.delivery/registry.json` e procura, entre os comentários dos agentes de QA no pai (`dev_qa`, `dev_rapido_qa` e `dev_ultra_qa`), o mais recente que cita o SHA40. Esse comentário precisa vir de uma execução concluída do próprio QA sobre o pai, ou da execução em andamento que está publicando, quando é a mesma tarefa e o mesmo agente QA, e ter uma única linha `RESULTADO=APROVADO`. Por isso o `dev_rapido_qa` e o `dev_ultra_qa` rodam o verificador logo depois do comentário de aprovação e antes de qualquer outro comentário com o mesmo SHA. Um resultado mais novo para o mesmo SHA, como uma rejeição, invalida a aprovação anterior. Status de issue não entra na conta. `--qa-issue UUID` mantém o modo anterior, para entregas antigas cujo QA rodou numa issue filha `done`. Delivery executa o verificador depois de conferir que QA, PR e CI se referem ao mesmo SHA, antes de registrar a espera pelo merge. Nunca criar status manual. Commit novo exige novo QA e nova publicação.

## Entrega e situação real

O usuário gerencia deploy. O agente de Delivery recebe o SHA aprovado, confirma o que foi realmente implantado e registra a validação; não presume que merge é produção nem altera o CD. A issue GitHub fecha após evidência de entrega, e o pai Multica é consolidado com os mesmos fatos. O uso de `Refs` evita fechamento automático no merge.

## Medição

Medir por entrega/Tier: tempo até entrega, espera, aprovação de primeira revisão, rodadas, falhas de ambiente, custo e tokens/cache por agente. O ciclo inicial é um piloto, não uma promessa de capacidade. Não equiparar redução de caracteres de skills a economia faturada.


## Exceção explícita para legado

`not-applicable` continua proibido para código de comportamento. O modo
`legacy-exception` referencia um registro em `.delivery/exceptions/DMTE-N.json`
com `version: 1`, `delivery`, `github_issue`, `base_sha`, `legacy_sha`, `criteria`,
`reason` e `approval` (`status`, `approved_by`, `source`).

A aprovação deve ser explícita, com status `approved`, nome do responsável e
link ao comentário na issue GitHub canônica (`#issuecomment-N`). O registro
pendente bloqueia o contrato. Não atribua uma aprovação inexistente ao usuário.
QA confere a autoria e o conteúdo na origem: o gate valida o registro e seu
vínculo, mas não autentica aprovação remota nem prova a identidade de quem o editou.

O snapshot legado e a base precisam ser SHAs completos e ancestrais do checkout.
`criteria` enumera exatamente os ACs com `tdd_required: false`, cada um com sua
justificativa. A exceção não elimina os critérios funcionais nem a revisão de QA.
As evidências `red` e `green` continuam obrigatórias para o trabalho novo, usando
`legacy_sha` como base, e cobrem os critérios não dispensados. Alterações após o
GREEN invalidam os hashes. Não capture um RED retroativo para o código legado.

## Métodos Matt originais

Ver docs/agents/engineering-workflow.md para métodos/papéis e docs/agents/matt-workflow.json para origem e dependências. to-spec é a autoridade do template da SPEC; aponta-sdd acrescenta critérios do projeto na mesma SPEC. tdd é a autoridade do método; aponta-tdd registra evidências, com refatoração na revisão. As etapas Multica, delegadas por menção no pai, são fases de execução distintas dos tickets GitHub. O tracker não fecha trabalho automaticamente por PR; pr mantém o template original e os campos Aponta-Delivery/Refs.
