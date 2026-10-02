# Matriz de Perfis e Workflows de Sistema (Aponta HD)

Este documento define a espinha dorsal de permissões (Role-Based Access Control) e a Máquina de Estados (Ciclo de Vida do Chamado) do núcleo corporativo do Aponta. Toda nova funcionalidade deve respeitar estas premissas.

## 1. Matriz de Perfis (RBAC)

O ecossistema divide-se em níveis administrativos e níveis de clientes:

| Perfil | Nível | Visibilidade de Tickets | Poderes Especiais |
| --- | --- | --- | --- |
| **ADMIN** | Interno | Completa (100% dos relatórios e tickets) | Criação de novos Departamentos (Service Desks), gestão global do Catálogo de Serviços, CRUD de todos os usuários. |
| **AGENT_MASTER** | Interno | Restrita à sua área / escalonamentos | Fura-fila de atribuição, reinicia/dilata contagem de SLA, gere/modera a Base de Conhecimento e supervisiona técnicos. |
| **AGENT** | Interno | Restrita à fila do seu Departamento | Atende tickets assinados a si próprio ou órfãos na sua fila. Gera subtickets e checklists. Resolve chamados. |
| **CLIENT_MASTER** | Externo (Cliente) | Todos os chamados da sua própria Organização | Poder de veto e aprovação sobre gastos/chamados sensíveis abertos por seus funcionários (`CLIENT`). |
| **CLIENT** | Externo (Cliente) | Apenas os próprios chamados que abriu | Abre chamados novos e responde pesquisas de satisfação (CSAT). Escopo altamente isolado. |

## 2. A Máquina de Estados (Ticket Statuses)

Atualmente no Schema: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
**Expansão Projetada (Versão 1.5):** `PENDING_CUSTOMER`, `ON_HOLD`, `PENDING_APPROVAL`, `ESCALATED`.

### Cenários de Fluxo (Workflows de Vida Real)

#### C1. O Caminho Feliz (Happy Path)
1. `CLIENT` cria originando status **OPEN**. Relógio do SLA (First Response e Resolution) é acionado.
2. `AGENT` localiza na fila departamental e reivindica. Status **IN_PROGRESS**.
3. `AGENT` realiza o reparo e finaliza seu trabalho alterando para **RESOLVED**.
4. (Motor Invisível) O Relógio de SLA pausa. Um gatilho notifica o cliente final solicitando confirmação/CSAT.
5. `CLIENT` atribui as estrelas aprovando a solução. Sistema marca ticket como **CLOSED** (imudável).

#### C2. Gargalo e Tempo de SLA (Escalonamento)
1. `AGENT` assume ticket e entende ser de Complexidade Avançada N3. SLA em risco.
2. Adiciona anotação restrita e muda status para (Novo) **ESCALATED**. Reatribui à fila superior.
3. Notificação soa no painel do `AGENT_MASTER`, que atua diretamente no ticket. Se provado que o problema original era diferente, o `AGENT_MASTER` recalcula o plano de SLA.

#### C3. Pêndulo do Cliente (Aguardando Retorno / Pending Customer)
*Regra de Ouro da Controladoria de Tempo.*
1. `AGENT` solicita uma evidência do problema à pessoa requisitante.
2. Altera status para (Novo) **PENDING_CUSTOMER**. **SLA congela imediatamente.**
3. `CLIENT` anexa a evidência via portal.
4. Ao receber o comentário web/e-mail (Reply IMAP), o ticket re-acorda automaticamente retornando para **IN_PROGRESS** e o SLA volta a contar.

#### C4. Quebra de Demanda (Pai e Filhos)
1. Ticket requisita serviço multi-setorial (Ex: *Onboarding de novo colaborador* -> RH, T.I. e Infra).
2. O `AGENT` isola a Issue primária alterando status para (Novo) **ON_HOLD**.
3. Sistematicamente (ou manualmente) 3 *Sub-Tickets* autônomos são despachados para filas diferentes.
4. Apenas quando a união dos fechamentos filhos totalizar 100%, a Issue Pai acende sinal verde para fechamento definitivo.

#### C5. Hierarquia de Gestor (Auditoria Tática)
1. Ticket exige autorização comercial ou custo adicional de licenciamento.
2. `AGENT` estaciona sob status (Novo) **PENDING_APPROVAL**.
3. Apenas perfis `CLIENT_MASTER` desta organização conseguem validar ou derrubar a proposta via painel. O `CLIENT` original assiste mas não interfere no poder de decisão da folha.

---
_Documento redigido aos 02/10/2026 como Design Base para as futuras engates de BI e Automação._
