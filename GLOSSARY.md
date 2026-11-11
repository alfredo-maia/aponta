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

**Fechamento automático**:
Encerramento do pré-apontamento pelo sistema quando o tempo trabalhado atinge a duração da agenda.
_Avoid_: Auto-stop
