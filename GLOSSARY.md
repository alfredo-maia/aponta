# Aponta

Helpdesk em que consultores registram horas nos tickets contra a agenda e contratos do cliente.

## Language

**Agenda**:
Compromisso do tipo AGENDA de um consultor, com janela de início e fim, em geral ligado a um ticket.
_Avoid_: Calendário, escala

**Janela de atendimento**:
Intervalo em que um apontamento é aceito direto: de 1 dia antes do início da agenda até o fim dela.
_Avoid_: Horário permitido

**Apontamento**:
Registro de horas trabalhadas por um consultor num ticket, com início, fim e tipo de atendimento.
_Avoid_: Worklog, lançamento

**Pré-apontamento**:
Cronômetro aberto pelo PLAY que se torna apontamento ao ser parado.
_Avoid_: Timer

**Apontamento pendente**:
Apontamento que fugiu da regra da janela e aguarda aprovação; já conta como faturável.
_Avoid_: Apontamento em análise

**Apontamento travado**:
Apontamento encerrado por limite ou por pausa, ou depois do fim da janela, que só muda com aprovação.
_Avoid_: Apontamento bloqueado

**Liberação**:
Decisão de quem tem a permissão do tipo sobre um apontamento pendente: liberar o mantém, negar o estorna com motivo. Cada tipo (Lançamento, Cronômetro encerrado) tem a sua permissão.
_Avoid_: Aprovação, autorização

**Fechamento automático**:
Encerramento do pré-apontamento pelo sistema quando o tempo trabalhado atinge a duração da agenda.
_Avoid_: Auto-stop

**Aguardando Sankhya**:
Status do ticket parado porque depende de um chamado aberto na Sankhya; pausa o SLA e conta como pausado.
_Avoid_: Aguardando Chamado Sankhya, Aguardando Terceiros (este é outro status, para terceiros em geral)

**Catálogo de serviços**:
Lista de categorias e itens oferecida na abertura de um chamado; cada item aponta para uma mesa de destino e uma prioridade padrão.
_Avoid_: Catálogo de atendimento, tipos de solicitação

**Item do catálogo**:
Serviço pré-definido do catálogo de serviços que, ao ser escolhido, fixa a mesa e a prioridade do chamado.
_Avoid_: Serviço cadastrado, tipo de chamado

**Chamado não catalogado**:
Chamado aberto sem item do catálogo, quando o solicitante declara que o problema não está catalogado.
_Avoid_: Chamado em branco, chamado avulso

**Catálogo de conhecimento**:
Classificação dos artigos da base de conhecimento por serviço; é outro recurso, sem relação com a mesa de destino de um chamado.
_Avoid_: Catálogo de serviços

**Atalho da lista**:
Botão da lista de Tickets que liga e desliga um filtro pronto, sem abrir a Busca avançada.
_Avoid_: Aba de estado, preset

**Autorização**:
Ticket em Aguardando Aprovação, que um perfil administrativo ou MASTER precisa liberar antes de seguir.
_Avoid_: Aprovação pendente
