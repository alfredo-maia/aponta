# Aponta Evolution & Tiflux Benchmarking SDD

**Date:** 2026-10-02
**Project:** Aponta (Helpdesk & Ticket System)
**Goal:** Evoluir o sistema Aponta a partir do MVP, construindo uma arquitetura robusta baseada no benchmark do Tiflux. O foco central é o isolamento de dados (Multitenancy) e o controle rigoroso de papéis (RBAC - Role-Based Access Control) aplicados módulo a módulo, resolvendo lacunas de segurança, visibilidade e produtividade da operação.

## 1. Architecture & Tech Stack
- **Backend:** NestJS, Prisma ORM, PostgreSQL.
- **Frontend:** React, TailwindCSS, Vite.
- **Security:** Controle via `RolesGuard` e filtros dinâmicos no Prisma (Multitenant/RBAC isolation).

## 2. Core RBAC Design
A espinha dorsal da evolução do Aponta é a estrutura de permissões (Role enum) e o isolamento organizacional (Tenant).

1. **ADMIN:** Gestão global, visão cross-tenant irrestrita, acesso financeiro e configurações de sistema.
2. **AGENT_MASTER / AGENT:** Visão restrita à operação (tickets atribuídos / ServiceDesks). Sem acesso financeiro (`Contratos`), administrativo (`Configurações`) parcial e `Base de Conhecimento` interna liberada. Edição de dados críticos bloqueada.
3. **CLIENT_MASTER:** Visão corporativa filtrada estritamente pelo seu `OrganizationId` (Tenant). Vê os recursos da sua empresa (Cofre da própria empresa, tickets da sua equipe, relatórios de consumo da empresa). Interface simplificada sem configuração de plataforma.
4. **CLIENT:** Visão estritamente ligada ao seu `userId`. Vê e interage apenas com seus próprios tickets e chats. Sem acesso ao resto do sistema (Cofres, Contratos, Clientes ocultos da navegação).

O frontend utilizará o `user.role` decodificado do JWT para esconder/renderizar menus. O backend aplicará a restrição forçada via banco (Prisma `where`), garantindo que usuários mal-intencionados não forcem a API.

---

## 3. Module Breakdown & UX/UI Strategy

### 3.1. Dashboard
- **Admin/Agent:** Visão focada em produtividade operacional.
  - *Resumo Global (Admin)* e *Meus Tickets (Agent)*.
  - *Produtividade:* Gráfico de Horas Agendadas vs Horas Executadas cruzando meta. Gaps de lançamento ficam em vermelho (déficit de horas).
- **Cliente Master:** Resumo consolidado de volumetria dos tickets do seu CNPJ.
- **Cliente Padrão:** Visão hiper-simplificada com status dos próprios tickets.

### 3.2. Tickets
- **Agrupamento & Filtros:** O seletor "Agrupar por Cliente" é padrão para Admin/Agent. Para a equipe, esse agrupamento deve filtrar automaticamente e exibir apenas os clientes sob os quais o Agent atua (via `_AgentServiceDesks`).
- **Isolamento de Estágios:** Clientes (Master/Padrão) não visualizam colunas de triagem interna ou fluxos do Kanban como "Em Revisão/Estágio N2".
- **Comentários Ocultos:** A camada de `Comments` (Linha do tempo) deve continuar rigorosamente testada: Cliente Padrão é impedido de ver conversas e trâmites internos.

### 3.3. Chats
- **Admin:** Visão total de fila e canais (Entrada, Atendimentos cruzados) e permissão de integrar botão de WhatsApp/Canais.
- **Agent:** Visão "Entrada" (triagem) e "Meus" (responsabilidade), zero acesso à integração corporativa ou configurações.
- **Cliente:** Interface de pura interação ("Conversas ativas" e "Histórico"), com botão de gatilho "Novo Chat" destacado. Removida toda a complexidade de rotas estilo dashboard.

### 3.4. Clientes (CRM Base)
- **Admin:** Acesso irrestrito ao CRUD das organizações, com controles destrutivos.
- **Agent:** Modo *Read-Only* de consulta geral ou focado aos clientes que atende. Botões destrutivos (Exclusão) ocultos/desabilitados.
- **Cliente Master:** Muda o contexto para "A Minha Empresa". Acessa apenas a listagem e controle de acessos da equipe do próprio CNPJ.
- **Cliente Padrão:** Menu **Cliente** é 100% ocultado (Route protection no React).

### 3.5. Contratos (Financeiro + SLA)
- **Admin:** Gestão visual completa (Valor do último adendo, Reajuste, Limite de horas, Somatória global).
- **Agent:** Bloqueio contábil. Visualiza apenas o status "Ativo" e a modalidade (ex: Cobertura/Horas) para orientar a operação técnica técnica.
- **Cliente Master:** Vê o status e as regras do próprio acordo (SLA, vigência, valor), limpo de qualquer console ou consolidado de terceiros.
- **Cliente Padrão:** Menu totalmente oculto.

### 3.6. Relatórios
- **Admin:** Acesso granular total — Faturamento, Atendentes, Auditoria (Excluídos, logs, erros sistêmicos).
- **Agent:** Limitado restritamente à área de produtividade e carga de trabalho e apenas para a visualização das *suas próprias horas* (Backend force-filters relatórios analíticos utilizando o `user.id`).
- **Cliente Master:** Extrato de consumo do CNPJ e avaliações de atendimento da sua equipe.
- **Cliente Padrão:** Menu ocultado.

### 3.7. Agenda
- **Admin:** Controle multi-agent, filtragem (Compromissos, Apontamentos, Ausências) de toda a equipe e permissionamento para criar alocações sistêmicas (visão global temporal).
- **Agent:** Calendário engessado ao seu contexto (filtro de usuários fixado em si mesmo). Inserção e edição exclusivas dos seus blocos temporais.
- **Cliente Master:** Visão filtrada pelo Tenant-ID no Backend (exclusividade dos agendamentos relativos ao seu CNPJ). A equipe técnica não pode ser exposta (férias/ausências invisíveis).
- **Cliente Padrão:** Menu e acesso bloqueados.

### 3.8. Base de Conhecimento (Conhecimentos)
- **Admin / Agent:** Documentação de processo interno (Repositório de rotinas, DevOps, Guias Sankhya/DM TECH). Todos acessam ferramentas de edição e nova submissão; Admin é o único com destruição de pasta.
- **Exposição Pública:** Um flag (ex. `isPublic`) nos registros do Prisma define a visibilidade. Cliente só tem permissão de leitura sobre diretórios flagados como base pública (FAQ, Autoatendimento), mascarando 100% da inteligência e tutoriais internos da consultoria.

### 3.9. Cofre de Senhas
- Módulo **Hyper-Security**.
- **Admin:** Top level permissions. Vê a árvore de todos os cofres do sistema, edita, limpa senhas antigas de clients offline.
- **Agent:** O cofre deve atuar estritamente em **Read-Only** e filtrado por matriz de permissão (ex. `Agent` atribuído à base X, lê o cofre HML/PRD da base X). Opção de cópia disponível, remoção de credentials bloqueada terminantemente.
- **Cliente Master:** Visão encapsulada (apenas root directory da própria empresa). Capacidade interativa ("Ações" para disponibilizar novas credenciais de forma segura aos agentes de suporte da DM Tech).
- **Cliente Padrão:** Sem acesso. Rota trancada.

### 3.10. Configurações
- **Admin:** Central de Integrações (WhatsApp, IA), fluxos, feriados da Mesa de Serviços, Grupos, Parametrização Comercial (Valores, Tipos Contrato).
- **Agent:** Dashboard de Settings reduzido apenas a `Minha Conta` (foto de perfil, assinatura).
- **Cliente Master:** Módulo adaptado para "A Minha Conta / Meu Perfil" onde, se integrado, faz apenas controle macro da credencial da Empresa.
- **Cliente Padrão:** Rota inexistente, jogando as preferências num modal de avatar simples.

---

## 4. Prisma Implementation Blueprint (Security Posture)

Para suportar essas especificações, os repositórios deverão construir as queries `findMany` com uma arquitetura de RBAC dinâmica que nunca deve confiar apenas no Frontend.

```typescript
// Exemplo canônico de como o backend deve agir em repositórios listáveis (Contratos, Relatórios, etc.)
async findAll(user: CurrentUserPayload) {
  const where: Prisma.EntityWhereInput = {};

  if (user.role === Role.CLIENT_MASTER) {
    // Isolamento corporativo
    where.organizationId = user.organizationId;
  } else if (user.role === Role.CLIENT) {
    // Isolamento pessoal rígido
    where.requesterId = user.id;
  } else if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
    // Isolamento de operação (Caso não tenha visão global)
    where.serviceDesk = { is: { agents: { some: { id: user.id } } } };
  }
  // ADMIN passa sem restrições
  return this.prisma.entity.findMany({ where });
}
```

## 5. Próximos Passos (Brainstorm -> Writing Plans)
Ao aprovar este documento, executaremos um plano detalhado para implementar os módulos de forma independente usando o framework TDD e regras já estabelecidas nas Skills do projeto Aponta. Recomendo começarmos o **Roadmap** destravando a evolução do **RBAC no Backend (Filtros de Tenant e Isolamento de Menu do Front)**, para que os pilares da segurança permitam as construções de Cofre e Financeiro/Contratos com excelência e risco zero.
## 6. API-First Layer & MCP Readiness (Model Context Protocol)
Para garantir que a base do Aponta seja futura e nativamente extensível para IA, a camada de comunicação (Backend API) será desenhada com o princípio de **"API-First e Headless"**. O objetivo é que **cada interação possível na interface** (cliques de botão, carregamentos de dados, transições de status) tenha uma correspondência direta em um endpoint REST rigoroso e isolado. Isso tornará a exportação para ferramentas **MCP** (Model Context Protocol) nativa e direta.

### 6.1. Princípios de Arquitetura da API
- **Action-Driven Endpoints:** Em vez de usar endpoints puramente CRUD e genéricos (ex: `PATCH /tickets/:id` passando JSON sujo), teremos endpoints de intenção clara (ex: `POST /tickets/:id/status`, `POST /clients`, `POST /contracts/:id/renew`).
- **Data Contracts (DTOs) Estritos:** Toda requisição e resposta exige uma tipagem via `class-validator` e `class-transformer` no NestJS. Todo JSON terá um schema perfeitamente previsível, o que é um pré-requisito para acoplar as funções como Ferramentas/Tools de LLMs via MCP (onde o schema dos parâmetros não pode flexibilizar).
- **Sem Lógica de Negócio no Frontend:** O React apenas renderiza estados e aciona as rotas. Regras como "Não pode pausar o ticket se X" ou "Cliente Padrão não edita campo Y" são resolvidas nas Guards e Services da API, retornando JSON com mensagens de erro formais (ex: `HttpException`).

### 6.2. Estruturação para Integração Ágil via MCP
Criaremos módulos de API com o *Swagger/OpenAPI* em mente (mesmo que opcionalmente ativado), para que a assinatura de cada endpoint do Aponta possa gerar automaticamente o `schema` de uma _Tool_ no MCP de forma programática.

*Exemplos de contratos que serão formalizados nas construções do plano:*
- `create_ticket(payload: CreateTicketDto)` -> `TicketResponse`
- `update_ticket_status(id: string, status: Enum)` -> `OkResponse`
- `list_active_contracts(organizationId?: string)` -> `Array<Contract>`
