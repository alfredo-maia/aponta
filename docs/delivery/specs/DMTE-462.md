# Apontamento do ticket: hora inicial por permissão, PLAY preso à agenda, fechamento automático e aprovação

Identidade: DMTE-462, issue dmrepositorio/aponta#189, Tier 3, ciclo 2026-11-09/2026-11-22. Pedido do Alfredo na issue Multica DMTE-462. Uma entrega com seis fatias (T1 a T6), cada uma com PR e QA próprios, em sequência (WIP 1), como a DMTE-427.

Marcações: [Código] fato observado na `main` em `d15fbcc`; [Humano] decisão do Alfredo nos comentários da issue Multica DMTE-462 (fio da triagem, rodadas de perguntas Q1 a Q28); [Proposta] sugestão minha que o Alfredo aceitou em bloco ("Aprovado" na Q25 a Q28) ou ainda não confirmada item a item.

## Problem Statement

Na tela de apontamento do ticket, qualquer consultor edita a hora inicial e a final e pode lançar horas sem relação com o que foi agendado. Só Miller, Alfredo e Daniel deveriam ter essa liberdade. Os demais deveriam começar o apontamento no momento em que a demanda começa, pelo botão PLAY, dentro do horário agendado, e esquecer o cronômetro aberto não pode gerar horas sem limite.

## Solution

A edição da hora inicial e final passa a depender de uma permissão de grupo. Quem não a tem apenas inicia pelo PLAY (relógio do servidor) ou lança manualmente dentro da janela de atendimento da agenda. Cada agenda limita as horas que podem ser apontadas nela. O cronômetro esquecido é encerrado sozinho por uma tarefa agendada, com aviso ao consultor e ao gerente. O que foge da regra fica pendente e é aprovado por quem tem permissão, e as horas pendentes já contam como faturáveis.

## User Stories

1. Como consultor sem permissão, quero iniciar o apontamento pelo PLAY no momento em que começo a demanda, para que a hora inicial seja a real.
2. Como consultor sem permissão, quero ver a hora inicial e final do apontamento somente leitura, para não alterá-las por engano.
3. Como Miller, Alfredo ou Daniel (membros do grupo com a permissão), quero digitar a hora inicial e final livremente, para corrigir apontamentos.
4. Como gerente, quero que o consultor só consiga iniciar o PLAY dentro da janela da agenda daquele ticket, para que o apontamento reflita o que foi planejado.
5. Como consultor, quero iniciar até 1 dia antes da agenda, para adiantar o atendimento quando necessário.
6. Como consultor, quero lançar manualmente um apontamento dentro da janela de atendimento, para registrar um atendimento que esqueci de iniciar.
7. Como consultor, quero poder ter mais de um cronômetro ativo, cada um na sua agenda, para atender tickets diferentes em paralelo.
8. Como gerente, quero que o cronômetro esquecido feche sozinho ao completar as horas da agenda, para que o apontamento não cresça sem controle.
9. Como consultor, quero ser avisado por e-mail e pelo sino quando meu cronômetro fechar sozinho, para conferir o apontamento.
10. Como gerente, quero ser avisado quando um cronômetro fechar sozinho ou houver pendência, para agir.
11. Como consultor, quero pausar e retomar o cronômetro e que a pausa seja guardada, para que o tempo parado não conte como trabalhado.
12. Como gerente, quero que uma pausa maior que 2 dias seja encerrada pelo sistema, para não deixar apontamento aberto indefinidamente.
13. Como consultor, quero enviar para aprovação um apontamento fora da janela, para registrar um atendimento excepcional.
14. Como aprovador, quero uma lista de apontamentos pendentes com a justificativa, para aprovar ou rejeitar com motivo.
15. Como gerente, quero que ninguém aprove o próprio apontamento, para manter controle.
16. Como gerente, quero marcar na agenda que um compromisso ignora a regra da janela, para apontamentos sem agenda.
17. Como administrador, quero ver as tarefas agendadas e suas execuções e configurar o cron de cada tipo, para operar os fechamentos automáticos.
18. Como consultor, quero ser impedido de apontar durante ausência ou férias, salvo aprovação.

## Implementation Decisions

Situação atual [Código]:
- O PLAY grava um pré-apontamento com início, fim e ticket, aceita o início enviado pelo navegador e não consulta a agenda. A pausa existe só no navegador e não é gravada.
- A agenda é o compromisso com tipo AGENDA, AUSÊNCIA ou FÉRIAS, usuário, janela e ticket opcional. Quem tem a permissão de agendar cria compromissos na própria agenda; o administrador cria para outros.
- Qualquer usuário com permissão de criar e editar apontamentos digita hora inicial e final, na criação e na edição. Só o administrador acessa valor e tipo de valorização, hoje já por permissão de grupo (DMTE-464 e DMTE-463).
- Existe agendador em processo (`@nestjs/schedule`) sem registro das execuções. Não há notificação dentro do sistema; o único canal é o e-mail. Não há papel de gerente de projetos.
- Permissões são chaves num catálogo, atribuídas por grupos em Configurações; o administrador não tem desvio nas chaves de valor (padrão da DMTE-464).

Decisões:
- [Humano] Permissão nova de edição de hora inicial e final; bloqueio também na API; a exceção é só de quem tem a permissão (gerente e administrador sem ela não são exceção). A regra vale para apontamentos novos e existentes.
- [Humano] Janela de atendimento: de 1 dia antes do início da agenda até o fim dela. Apontamento que começa fora vai para aprovação; dentro, vale direto. O total apontado por agenda não passa da duração da agenda.
- [Humano] A agenda manda: compromisso AGENDA do consultor ligado ao ticket. Para apontar sem agenda é preciso um compromisso marcado como "ignora a regra". Com mais de uma agenda, vale a que inclui o início do apontamento; empate, a que começa primeiro. Cada agenda tem o próprio limite.
- [Humano] Vários cronômetros ao mesmo tempo, respeitando a agenda de cada um. [Proposta aceita] O segundo PLAY na mesma agenda é recusado.
- [Humano] Ausência e férias que cobrem o instante bloqueiam o PLAY e o lançamento manual, salvo aprovação.
- [Humano] A agenda e o limite de horas são congelados no PLAY; alterar ou apagar a agenda depois não muda um fechamento em curso. Só quem tem a permissão nova de liberar apontamento sem agenda marca compromisso como "ignora a regra".
- [Humano] Quem não tem a permissão de editar hora inicial tem o início do PLAY tirado do relógio do servidor.
- [Humano] A pausa passa a ser guardada no servidor. O tempo pausado não conta como trabalhado. O fechamento automático ocorre quando o tempo trabalhado desde o PLAY atinge a duração da agenda (agenda 08:00 a 12:00, PLAY às 08:30, fecha às 12:30). Pausa maior que 2 dias, contada do momento da pausa, é encerrada pelo sistema com o tempo trabalhado até ali [Proposta aceita: a contagem parte da pausa]. Apontamento encerrado assim, ou após o fim da janela, fica travado: só muda com aprovação.
- [Humano] Estrutura de tarefas agendadas: tabela de tarefas com estado, tentativas e erro; executor com trava (sem duplicar execução com mais de uma instância), idempotente e que retoma atrasadas após reinício; cron de cada tipo salvo no banco, editável na tela por quem tem permissão própria, com validação e aplicação sem reiniciar; valor inicial de 1 minuto; sem biblioteca nova.
- [Humano] Aprovação: estado pendente para fora da janela, ausência/férias, encerramento por pausa e pedido de alteração de apontamento travado. Pendente conta como faturável e entra nos totais. Aprovador (permissão própria) aprova ou rejeita com motivo; rejeitado deixa de valer. Ninguém aprova o próprio apontamento. Consultor recebe e-mail e sino com a decisão.
- [Humano] Avisos: e-mail e sino de notificação ao consultor e aos membros de um grupo com permissão de aviso. O sino é funcionalidade nova (modelo, listagem, marcar lida, contador).
- [Proposta] Datas e janelas em America/Sao_Paulo, com os utilitários de horário de Brasília existentes. Permissões novas: edição de hora inicial, liberar apontamento sem agenda, aprovar fora da agenda, receber aviso de encerramento, gerenciar tarefas. A chave de edição não entra no grupo padrão do administrador (a chave é nova, então a migração não remove nada) e a migração cria o grupo de edição sem membros (como na DMTE-464); quem entra é decisão do Alfredo.
- [Proposta] Apontamentos que já existem não mudam retroativamente; só ficam com início e fim travados para quem não tem a permissão.
- [Proposta] Entre T1 e T2, quem não tem a permissão só lança pelo PLAY (manual recusado). T2 reabre o manual dentro da janela.
- [Proposta, T2] A permissão de marcar compromisso que ignora a regra chama-se `RELEASE_WORKLOG_WITHOUT_SCHEDULE` (nome em inglês, como o catálogo). Quando uma agenda do ticket e um compromisso que ignora a regra cobrem o mesmo instante, vale a agenda do ticket (o limite continua valendo). Alterar ou desmarcar um compromisso já marcado exige a mesma permissão.
- [Proposta, T4] `PreAppointment` ganha `pausedAt`, `pausedMs`, `windowEndsAt` (fim da agenda, congelado no PLAY) e `lockedReason` (LIMIT, PAUSE_EXPIRED ou WINDOW_CLOSED). O fim do pré-apontamento é início + tempo trabalhado (as pausas não entram), então o apontamento convertido tem os minutos trabalhados. Parar sem a permissão de hora inicial usa o relógio do servidor; parado em pausa, vale o instante da pausa. A tarefa `WORKLOG_AUTOCLOSE` (cron inicial de 1 minuto) fecha o cronômetro aberto quando o tempo trabalhado atinge o limite congelado, quando a pausa chega a 2 dias ou quando a janela da agenda fecha com ele pausado; o fechamento é por `updateMany` com `ending: null`, e só quem alterou a linha avisa. Retomar depois do fim da janela é recusado. O encerrado pelo sistema fica travado: a tela não oferece remover e a API recusa a remoção de quem não tem a permissão de hora inicial. Aviso por e-mail ao consultor e a quem tem `RECEIVE_WORKLOG_AUTOCLOSE_ALERT` (grupo "Aviso de apontamento encerrado", vazio, fora do grupo padrão do ADMIN).
- [Proposta, T3] A permissão `MANAGE_SCHEDULED_JOBS` segue o padrão das demais configurações (o ADMIN passa pelo guard de permissões). Tabelas `ScheduledJob` (uma linha por tipo, com cron, estado e próxima execução) e `JobRun` (execuções com estado, tentativa e erro). O executor roda a cada 30 s, pega as vencidas com `FOR UPDATE SKIP LOCKED` e agenda a próxima na mesma transação (uma tarefa atrasada roda uma vez, sem repor as perdidas); cron de 5 campos no fuso America/Sao_Paulo, validado pelo cálculo da próxima data; cron ruim no banco desativa só aquela tarefa; execução `RUNNING` há mais de 15 minutos vira `FAILED`; execuções com mais de 30 dias são apagadas. A tarefa de demonstração é `HEARTBEAT` (sem efeito), com cron inicial de 1 minuto. `attempt` é a contagem de falhas seguidas mais um.
- [Proposta, T2] `PreAppointment.appointmentId`, `PreAppointment.limitMinutes` e `Worklog.appointmentId` ficam sem chave estrangeira: apagar a agenda não solta o limite congelado nem a soma. A conferência de cronômetro aberto e de limite roda na transação, com a linha da agenda travada (`FOR UPDATE`).

## Acceptance criteria

T1 (permissão e travas):
- AC-01: sem a permissão de edição de hora inicial (qualquer role), a API recusa lançamento manual de apontamento e a alteração de início ou fim de apontamento existente; descrição, tipo de atendimento e demais campos continuam editáveis.
- AC-02: com a permissão (grupo direto ou do grupo técnico), qualquer role lança e altera início e fim.
- AC-03: o PLAY de quem não tem a permissão ignora o início enviado pelo cliente e usa o relógio do servidor; com a permissão aceita o início informado.
- AC-04: `/auth/me` informa se o usuário pode editar a hora inicial, e a tela mostra início e fim somente leitura e esconde o lançamento manual sem a permissão.
- AC-05: a chave existe no catálogo, o grupo padrão do administrador não a recebe, e a migração cria o grupo de edição de hora inicial sem membros.

T2 (agenda):
- AC-06: PLAY e lançamento manual sem permissão só são aceitos se o início cair entre 1 dia antes do início e o fim de um compromisso AGENDA do consultor ligado ao ticket; fora disso são recusados com mensagem (até T5).
- AC-07: a soma apontada por agenda não passa da duração dela; o excedente é recusado.
- AC-08: compromisso de ausência ou férias que cobre o instante bloqueia o PLAY e o lançamento manual.
- AC-09: com mais de uma agenda, vale a que inclui o início; em empate, a que começa primeiro.
- AC-10: o PLAY grava a agenda e o limite; alterar ou apagar a agenda depois não altera esse limite.
- AC-11: um consultor mantém cronômetros ativos em agendas ou tickets diferentes; o segundo PLAY na mesma agenda é recusado.
- AC-12: compromisso marcado "ignora a regra" libera o apontamento sem janela; marcar exige a permissão de liberar apontamento sem agenda, e consultor sem ela não consegue marcar.
- AC-13: quem tem a permissão de edição de hora inicial não fica preso à regra da janela no PLAY e no lançamento manual.

T3 (tarefas agendadas):
- AC-14: o executor roda cada tarefa vencida uma única vez mesmo com duas instâncias, registra estado, tentativas e erro, e executa as atrasadas depois de reiniciar.
- AC-15: o cron de cada tipo é editável por quem tem a permissão de gerenciar tarefas; expressão inválida é recusada; a mudança vale sem reiniciar; sem a permissão a API devolve 403.
- AC-16: a tela lista as tarefas e suas execuções, com o cron atual de cada tipo.

T4 (pausa e fechamento automático):
- AC-17: pausa e retomada são gravadas no servidor e o tempo trabalhado desconta as pausas.
- AC-18: o cronômetro fecha sozinho quando o tempo trabalhado atinge a duração da agenda congelada, com fim igual ao início somado à duração (08:30 numa agenda de 4 horas fecha às 12:30).
- AC-19: pausa maior que 2 dias, contada do momento da pausa, é encerrada com o tempo trabalhado até ali.
- AC-20: apontamento encerrado por limite, por pausa ou após o fim da janela fica travado: consultor sem permissão não o altera (até T5).
- AC-21: o fechamento automático envia e-mail ao consultor e aos membros do grupo com a permissão de receber aviso.
- AC-32: o fechamento automático (fechar o cronômetro e avisar) só roda com a flag `fechamento-automatico-cronometro` ligada, registrada com dono e data de remoção e ligada por padrão; desligada, a tarefa não fecha, não avisa e nem consulta os cronômetros.

T5 (aprovação):
- AC-22: o que seria recusado por janela, ausência ou férias, o encerrado por pausa e o pedido de alteração de apontamento travado ficam pendentes em vez de recusados.
- AC-23: apontamento pendente é faturável e aparece nos totais.
- AC-24: quem tem a permissão de aprovar vê a lista de pendentes; aprovar torna o apontamento válido; rejeitar exige motivo e o apontamento deixa de valer.
- AC-25: quem lançou o apontamento não consegue aprová-lo, mesmo com a permissão.
- AC-26: o consultor recebe e-mail com a decisão, e os aprovadores recebem aviso de nova pendência.

T6 (sino):
- AC-27: o sistema guarda notificações por usuário, lista, marca como lida e mostra o contador no sino; um usuário não vê notificação de outro.
- AC-28: o fechamento automático (T4) e os eventos da aprovação (T5) geram notificação no sino além do e-mail.

## Testing Decisions

Um bom teste observa comportamento externo (resposta da API, estado gravado, o que a tela mostra), não detalhes de implementação. Seams [Humano, aprovadas]:
1. Política da janela da agenda: função pura que recebe compromissos e instante e devolve dentro ou fora, qual agenda vale, limite e se precisa de aprovação. Teste de unidade, sem banco. Cobre AC-06 a AC-09.
2. Serviço de apontamentos com o serviço de permissões, como os testes atuais de apontamento e de valor (DMTE-464). Cobre AC-01 a AC-03, AC-05, AC-10 a AC-13, AC-17 a AC-20, AC-22 a AC-25.
3. Executor de tarefas com relógio injetado. Cobre AC-14, AC-15, AC-18, AC-19, AC-21.
4. Tela de apontamento guiada pelas permissões de `/auth/me` (Vitest), como na DMTE-464. Cobre AC-04, AC-16, AC-24, AC-27, AC-28.
TDD real por fatia, com RED por asserção gravado pelo coletor antes da implementação. Dados sintéticos e banco de teste.

## Out of Scope

Relatórios comerciais que mostram valor ou custo; mudança de role dos usuários; notificações push; deploy (gerido pelo Alfredo); alteração retroativa de apontamentos existentes além do travamento; faturamento definitivo e estorno de hora pendente rejeitada (tratamento a definir pelo Alfredo).

## Further Notes

Riscos:
- Hora pendente é faturável [Humano]; pode ser faturada e depois rejeitada. O tratamento da rejeição no faturamento fica pendente de decisão do Alfredo.
- Deploy do T1 sozinho impede o lançamento manual de quem não tem a permissão até o T2. Recomendação: publicar T1 e T2 juntos. O deploy é do Alfredo.
- Depois do deploy do T1, ninguém edita hora inicial até o Alfredo montar o grupo (efeito igual ao da DMTE-464).
- RBAC e tenant: bloqueios no servidor, nunca só na tela; QA confere administrador sem a permissão e usuário com a permissão fora do administrador; notificações isoladas por usuário.
- Concorrência: tarefas com trava e idempotência para mais de uma instância da API.
- T4, riscos aceitos: o aviso é só por e-mail, e o sino é do T6; se o SMTP não estiver configurado o `MailService` apenas registra o erro e o cronômetro fecha do mesmo jeito; o cronômetro encerrado pelo sistema só pode ser convertido com os horários dele e não tem como ser ajustado ou removido por quem não tem a permissão até o T5.
- T4, outros riscos aceitos (code-review): quem já tinha apontado na mesma agenda pode ver o cronômetro fechar por limite e depois não conseguir convertê-lo, porque o limite congelado é a duração inteira e a conversão confere a soma; cronômetros criados entre o T2 e o T4 não têm o fim da janela e não fecham por janela; no fechamento por limite com pausa, o trecho entre o fim do apontamento e o relógio real não pertence a ninguém; o erro de retomar depois da janela (403) ainda não tem mensagem na tela; a lista de cronômetros só atualiza com uma ação, então o fechamento automático aparece na próxima consulta; falha de SMTP é só registrada pelo `MailService`.
- T3, risco aceito: uma tarefa mais longa que o intervalo do cron pode rodar em paralelo consigo mesma, porque a trava vale só no claim; hoje só existe `HEARTBEAT`, e o T4 deve rodar rápido ou ganhar uma trava própria.
- T2, riscos aceitos: cronômetro anterior ao T2 ou criado por quem tem a permissão de hora inicial não tem agenda e converte sem checar janela nem limite (só com os horários dele); quem tem a permissão de hora inicial também não é barrado por ausência ou férias; o cronômetro que passa do limite só é recusado na conversão, e quem não tem a permissão não ajusta os horários até o fechamento automático (T4) e a aprovação (T5); o consultor que cria a própria agenda a usa como janela, porque a permissão de agendar é a que já existe.
- DS: reutilizar os componentes do DS do Aponta; componente novo do sino exige story ou exceção documentada.

Fatias (cada uma com PR e QA próprios, em sequência): T1 → T2 → T3 → T4 → T5 → T6. T4 depende de T2 e T3; T5 de T2 e T4; T6 de T4 e T5. Glossário em `GLOSSARY.md`.
