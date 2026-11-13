# Fluxo de entrega Aponta

## Cadência e identidade

Ciclos quinzenais automáticos, execução em Kanban e práticas XP. Os ciclos são janelas de 14 dias contadas a partir de 26/10/2026 (26/10–08/11, 09/11–22/11 e assim por diante), sem cadastro manual: `python3 scripts/aponta_delivery.py cycle [--date AAAA-MM-DD]` devolve o id `início/fim`, e o verificador rejeita no registro qualquer ciclo fora dessa cadência. Sprint não é uma única issue: agrupa entregas pequenas, priorizadas pelo responsável humano. Entregar quando pronto; revisar objetivo e impedimentos semanalmente e resultados ao final do ciclo.

O ciclo é rótulo de planejamento, não prazo nem portão. Quem coordena registra o ciclo vigente quando a entrega entra na esteira, sem perguntar ao humano, e a entrega mantém esse ciclo se terminar no seguinte. Entrada ainda não iniciada fica com `cycle: null`. Nenhuma etapa espera decisão de ciclo; adiar ou priorizar uma entrega é decisão humana sobre a fila, não sobre o ciclo. O WIP de uma entrega em implementação/revisão conta até o merge; entrega mergeada aguardando aceite não ocupa a vaga.

GitHub registra produto; Multica registra execução. Uma entrega tem uma issue GitHub principal e um pai Multica canônico. Épicos agrupam entregas; não são executados como uma única tarefa longa. As etapas de Triagem/Architect/Developer/QA/Delivery são delegadas por menção no pai Multica canônico e não geram issues GitHub nem issues Multica por fase. Tickets de implementação produzidos por to-tickets são sub-issues GitHub da SPEC e herdam a identidade da entrega, conforme docs/agents/issue-tracker.md.

A identidade versionada de uma entrega é o próprio manifest `.delivery/deliveries/DMTE-N.json`: issue GitHub principal e pai Multica. O verificador recusa duas entregas com a mesma issue ou o mesmo pai. `.delivery/registry.json` guarda os épicos e as entregas anteriores a DMTE-470 e não é mais editado a cada PR, o que acabava em conflito entre PRs paralelos; quando uma entrega tem entrada nele, o manifest precisa coincidir com ela. Nenhum dos dois é uma automação bidirecional de status. A implantação verifica os vínculos reais pelos serviços autenticados; CI verifica a estrutura sem credenciais Multica. Cada PR declara exatamente `Aponta-Delivery: DMTE-N` e `Refs dmrepositorio/aponta#N`.

## Esteira

O líder delega cada etapa por menção no pai canônico, uma por vez, na ordem Triagem → Architect → Developer → QA → Delivery, com o briefing no comentário. O responsável responde no fio da menção e não altera o status do pai; só o líder muda esse status, e o pai vai para revisão depois que o Delivery verificou a entrega. Bug pequeno Tier 1 com critérios confirmados pode dispensar o Architect, com o motivo registrado no pai. Funcionalidade nova/grande refatoração executa grill-with-docs → to-spec → to-tickets no Architect, independentemente do Tier. Rejeição do QA gera uma nova menção ao Developer para a correção e, depois, uma nova menção ao QA para o novo SHA. Issue filha só é usada quando há trabalho em paralelo que não cabe num único fio. O limite nativo de retomadas não deve ser aumentado ou desativado para contornar uma esteira incorreta.

O Squad Rápido executa a mesma esteira com três agentes, sem remover etapa nem evidência: o líder `dev_rapido_lider` acumula coordenação, Triagem e Architect; `dev_rapido_executor` é o Developer; `dev_rapido_qa` acumula QA e Delivery. Triagem e planejamento rodam na execução do líder, que publica no pai o resultado de cada etapa num comentário próprio, com a linha `RESULTADO=`, e segue sem menção a si mesmo; despachos e conferências do líder não levam `RESULTADO=`. Developer e QA/Delivery continuam por menção no pai. Defeito que o líder reproduz ao conferir a implementação volta ao Developer antes do QA, com a reprodução registrada no pai; suspeita não reproduzida fica no pai como pendência e recebe veredito do QA. O QA continua obrigatório no SHA final. Os limites de cada papel não mudam: o líder não implementa nem revisa, o Developer não aprova, e o `dev_rapido_qa` nunca revisa trabalho próprio. Depois do próprio `RESULTADO=APROVADO`, o `dev_rapido_qa` publica o Independent QA e segue para a entrega na mesma execução; a espera pelo merge é um segundo comentário, `RESULTADO=BLOQUEADO`, e a verificação pós-merge é uma nova menção a ele. O Squad Dev Aponta continua válido com os seis agentes.

O Squad Ultra Rápido executa a mesma esteira com dois agentes: `dev_ultra_lider` acumula coordenação, Triagem, Architect, Developer e Delivery; `dev_ultra_qa` faz só a revisão independente. Cada etapa do `dev_ultra_lider` fecha num comentário próprio no pai com uma linha `ETAPA=` (`TRIAGEM`, `PLANEJAMENTO`, `IMPLEMENTACAO` ou `ENTREGA`) e uma `RESULTADO=`; a implementação aprovada exige o code-review do método na mesma rodada. A execução do líder só para por decisão ou passo humano ou para a revisão: o SHA final vai ao `dev_ultra_qa` por menção no pai. O `dev_ultra_qa` nunca revisa trabalho próprio; depois do próprio `RESULTADO=APROVADO`, publica o Independent QA na mesma execução, e o `dev_ultra_lider` faz a entrega: com os quatro checks verdes no head exato e o atestado nesse mesmo SHA, ele coloca o PR na fila de merge (`gh pr merge <n> --auto`, sem estratégia: a fila decide), cria no pai os wakeups `--until-pr merged` e `--until-pr conflicts`, move o pai para `blocked` e publica `RESULTADO=BLOQUEADO` ("na fila de merge"). O wakeup `merged` retoma a entrega para conferir merge, CD e comportamento; o `conflicts` devolve a branch ao líder, que a atualiza e roda os gates, com novo QA se o código revisado mudou. Não há confirmação humana do merge no fio. Correção pedida pelo QA volta ao `dev_ultra_lider` e passa por um novo QA.

Dois erros iguais de ambiente ou duas rejeições pela mesma causa exigem diagnóstico, não repetição automática. Etapas futuras não são despachadas antes da hora. Só uma entrega é liberada para implementação/revisão por vez; implement-spec pode coordenar até dois tickets liberados dentro dessa mesma entrega, em worktrees/branches novos e exclusivos, com um único coordenador e integração. Aumentar o número de entregas concorrentes exige isolamento e medições.

## Branch, evidências e revisão

Use branch curta e PR; uma retomada utiliza a branch já existente. Execute comandos críticos com a trava cooperativa do host:

```sh
python3 scripts/aponta_delivery.py with-lock -- python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

A trava cobre a duração do comando, não uma conversa inteira nem outros hosts. Não substitui o WIP, a separação de papéis ou o isolamento de branch.

O manifest `.delivery/deliveries/DMTE-N.json` declara identidade, ciclo, Tier, critérios e testes, SPEC quando aplicável, TDD e avaliação do DS. O SPEC associa cada AC ao teste; mudanças de escopo atualizam a especificação antes de implementar.

Gere o manifest com o comando, depois de escrever a SPEC, em vez de copiar o de outra entrega:

```sh
python3 scripts/aponta_delivery.py init --delivery DMTE-N --github-issue NUMERO --multica-id UUID_DO_PAI --tier 2 --spec docs/delivery/specs/DMTE-N.md --ds-reason "MOTIVO, SE NÃO HOUVER UI"
```

Ele preenche identidade, ciclo automático, caminhos de evidência e os critérios lidos das linhas `AC-NN: descrição` da SPEC, e recusa manifest existente ou identidade já usada. Os testes de cada critério ficam vazios e o `check` falha até serem nomeados. Sem `--ds-reason`, a avaliação do DS fica marcada como aplicável e precisa ser preenchida.

Capture RED antes de implementar e GREEN no mesmo comando e teste, usando uma base SHA fixa:

```sh
python3 scripts/aponta_delivery.py record --phase red --base BASE_SHA --out .delivery/evidence/DMTE-N/red.json --test-file CAMINHO_TESTE --ac AC-01 -- COMANDO_DE_TESTE
python3 scripts/aponta_delivery.py record --phase green --base BASE_SHA --out .delivery/evidence/DMTE-N/green.json --test-file CAMINHO_TESTE --ac AC-01 -- COMANDO_DE_TESTE
python3 scripts/aponta_delivery.py check --manifest .delivery/deliveries/DMTE-N.json
```

O RED roda contra o código commitado da entrega. `record --phase red` recusa a captura, sem gravar evidência, quando um fonte que a entrega já commitou está no diretório de trabalho numa versão anterior (a da base ou a de um commit anterior da branch) ou foi apagado; o `check` rejeita um RED gravado assim. Num ciclo de correção, escreva o teste que reproduz o achado e grave o RED contra o código atual. Se o código pronto não permite um RED honesto, registre a lacuna e leve a decisão ao humano; nunca reverta código para produzir a falha.

A base e os arquivos alterados da entrega são lidos do Git a cada verificação: a base é o merge-base do PR com a `main`, e os arquivos são o diff a partir dela. O manifest não precisa gravar `base_sha` nem `changed_files`, e a `main` andar não pede commit novo na entrega. Manifests antigos que trazem esses campos continuam aceitos; no PR, eles são ignorados em favor do Git. O RED/GREEN gravado numa base mais antiga continua válido quando essa base é ancestral da base atual e nenhum arquivo alterado ou testado pela entrega mudou entre as duas. Arquivos apagados ou renomeados pela entrega contam como alterados. Se a `main` tocou um desses arquivos, a evidência perde a validade e a entrega volta ao QA com evidência nova; `python3 scripts/atualizar_entrega.py DMTE-N` regrava o GREEN nesse caso e não faz push. A fila de merge testa a `main` combinada com o PR, então a branch não precisa estar atualizada para entrar nela; dentro da fila, o contrato é verificado na árvore do head do PR.

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

Ele lê o pai canônico no `.delivery/registry.json` ou, sem entrada lá, no manifest da entrega, e procura, entre os comentários dos agentes de QA no pai (`dev_qa`, `dev_rapido_qa` e `dev_ultra_qa`), o mais recente que cita o SHA40. Esse comentário precisa vir de uma execução concluída do próprio QA sobre o pai, ou da execução em andamento que está publicando, quando é a mesma tarefa e o mesmo agente QA, e ter uma única linha `RESULTADO=APROVADO`. Por isso o `dev_rapido_qa` e o `dev_ultra_qa` rodam o verificador logo depois do comentário de aprovação e antes de qualquer outro comentário com o mesmo SHA. Um resultado mais novo para o mesmo SHA, como uma rejeição, invalida a aprovação anterior. Status de issue não entra na conta. `--qa-issue UUID` mantém o modo anterior, para entregas antigas cujo QA rodou numa issue filha `done`. Delivery executa o verificador depois de conferir que QA, PR e CI se referem ao mesmo SHA, antes de registrar a espera pelo merge. Nunca criar status manual. Commit novo que muda código, critérios de aceite ou SPEC exige novo QA. Quando o commit novo só registra governança (`.delivery/`, `docs/`) ou traz a `main` sem tocar nos arquivos da entrega, o código revisado é o mesmo: rode o verificador de novo com o SHA novo e ele republica o atestado, citando o SHA que o QA aprovou; se houver qualquer diferença em código, critérios ou SPEC, ele recusa. Na fila de merge, o job `Independent QA` confirma que o head do PR tem o atestado, porque o commit da fila não recebe o status do QA.

## Estados da entrega

Uma entrega passa por seis estados. Cada um tem evidência própria e nenhum é presumido a partir de outro. Os três primeiros acontecem no PR; os três últimos, depois do merge. O detalhe técnico de fila, staging e produção está em `docs/delivery/RELEASE.md`.

| Estado | Responsável | Pré-condições | Evidência | Concluído quando | Se falhar | Próximo |
|---|---|---|---|---|---|---|
| **Implementado** | Developer (`dev_ultra_lider` no Ultra) | Issue GitHub, pai Multica, manifest e SPEC quando o Tier exige | Commits na branch, RED/GREEN do coletor, PR com `Aponta-Delivery` e `Refs` | `check --manifest` e os verificadores do projeto passam no SHA final | Corrige na mesma branch; RED impossível vira BLOQUEADO para o humano | QA |
| **Revisado** | QA independente | SHA final, base, SPEC e pedido de revisão | Parecer no pai com `RESULTADO=` e o SHA40; status `Independent QA` publicado por `publicar_qa.py` | `RESULTADO=APROVADO` no SHA exato | REJEITADO volta ao Developer com o achado; BLOQUEADO diz o que falta | Líder |
| **Apto para integração** | Líder | Revisado | Os quatro checks obrigatórios verdes no head do PR (`gh pr view`), sem commit depois da aprovação | `mergeStateStatus` limpo | Check vermelho volta ao Developer; pendente espera | Líder (coloca o PR na fila) |
| **Integrado** | Fila de merge | Líder colocou o PR na fila (`gh pr merge <n> --auto`) com os quatro checks verdes no head e o atestado do QA nesse SHA | Commit de merge na `main`; os quatro checks no candidato da fila; CI do push | CI do push verde no commit de merge | Candidato que falha sai da fila e volta ao PR | Workflow de CD |
| **Validado em staging** | Workflow `CD (Produção)`, job Staging | Integrado; commit é a ponta da `main` com CI verde | Registro `records/<sha>.json` com as imagens e cada verificação; log do job | `staging.result = passed` | Registro `failed`; produção não recebe o commit; o líder separa defeito de ambiente | Job Produção |
| **Publicado em produção** | Workflow `CD (Produção)`, job Produção | Validado em staging com as mesmas imagens; commit contém o que está no ar | `production.result = passed` no registro; `/api/version` e `/version.json` com o commit | Smoke de produção passa | Fica na versão anterior ou o usuário faz rollback | Delivery (confere o comportamento) e usuário (aceite) |

Aceite é do usuário e vem depois de Publicado. Funcionalidade atrás de feature flag desligada está publicada, mas não exposta; o registro da entrega diz o estado da flag.

### Quando a evidência perde a validade

- **RED/GREEN**: quando um fonte ou teste da entrega muda depois do GREEN, ou quando a `main` altera um arquivo que a entrega toca.
- **Parecer do QA e `Independent QA`**: valem para um SHA. Commit novo que muda código, critérios ou SPEC exige nova revisão; commit que só mexe em `.delivery/` e `docs/`, ou traz a `main` sem tocar nos arquivos revisados, mantém o parecer e o verificador republica o atestado.
- **Checks do PR**: valem para o head. Qualquer push os refaz.
- **Validação da combinação**: vale para o candidato da fila. A `main` andar cria outro candidato, validado de novo.
- **Registro de staging**: vale para um commit e para aquelas imagens. Imagem reconstruída ou outro commit exigem novo ciclo de staging.
- **Publicação**: vale até o próximo deploy. O que está no ar se lê em `/api/version`, não em relatório.

Onde o CI, o registro do deploy ou a API já guardam a evidência, cite o link ou o SHA em vez de copiar o conteúdo para um relatório.

## Entrega e situação real

No Squad Ultra Rápido, o `dev_ultra_lider` coloca o PR aprovado na fila de merge (`gh pr merge <n> --auto`) e espera como `blocked` pelos wakeups `--until-pr merged` e `--until-pr conflicts` criados por ele no pai; a fila continua sendo o gate, e `Independent QA` é um dos quatro checks no candidato. Nos demais squads, o usuário coloca o PR na fila. Em nenhum caso há push direto na `main` nem merge fora da fila. O workflow `CD (Produção)` valida no staging e promove para produção; nenhum agente o aciona ou roda deploy à mão. O agente de Delivery recebe o SHA aprovado, lê nos runs e no registro o que foi realmente implantado e registra a validação; não presume que merge é produção nem altera o CD. A issue GitHub fecha após evidência de entrega, e o pai Multica é consolidado com os mesmos fatos. O uso de `Refs` evita fechamento automático no merge.

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
