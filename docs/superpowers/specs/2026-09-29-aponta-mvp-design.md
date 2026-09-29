# Aponta - MVP (V1) Design Document

> **Spec Source:** Extraído da documentação pública do Tiflux (via `crawl4ai`) e cruzado com a stack alvo (Nx Monorepo: NestJS + Prisma + React).
> **Classificação do Projeto:** Arquitetural (Greenfield).

## 1. Visão Geral e Escopo (YAGNI)
O **Aponta** na primeira versão (MVP) é uma plataforma de Service Desk (ITSM) focada 100% no fluxo central de trabalho. O objetivo é ter um produto funcional o mais rápido possível para atender clientes externos e internos.

**O que entra no MVP (Os 4 Pilares):**
1. **Gestão de Tickets:** Abertura de chamados, Atribuição (Quem resolve), Status do fluxo de vida (Aberto → Em Andamento → Resolvido), e Timeline (comentários/anotações no ticket).
2. **Mesas de Serviço (Times):** Classificação organizacional. Todo ticket pertence a uma "Mesa" (Ex: Suporte N1, Infra, RH) e pode ter um Agente responsável.
3. **Gestão de SLA Básica:** Prazo limite de resposta e resolução amarrados diretamente ao ticket baseado na Prioridade/Tipo.
4. **Dashboard de Fila:** Interface visual (Kanban/Listagem) para os agentes visualizarem o que está pendente e o que vence em breve.

**O que NÃO entra no MVP (Fases futuras):**
- Chat em tempo real (WebSockets)
- SSO (Google/Microsoft)
- Cofre de senhas
- Relatórios avançados e extração de dados (API pública)
- Integrações externas pesadas (WhatsApp, Telefonia)

## 2. Arquitetura de Alto Nível
Seguindo o padrão do `wms-monorepo`, o projeto roda em um **Nx Monorepo (pnpm)**:
- **Backend (`apps/api`):** NestJS 11 como framework. Prisma ORM (v7.8+) para modelagem e acesso ao PostgreSQL. Autenticação via JWT (Passport).
- **Frontend (`apps/web`):** React 19 + Vite. Tailwind CSS para estilização. Zustand para gerenciamento de estado global (sessão, cache). Tanstack React Query para fetch de dados da API. React Router para navegação.
- **Banco de Dados:** PostgreSQL rodando via Docker Compose (`docker-compose.dev.yml`).

## 3. Modelo de Dados (Prisma Schema - Proposto)

```prisma
// Principais entidades do MVP

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // Hash bcrypt
  role      Role     @default(AGENT) // ADMIN, AGENT, CLIENT
  tickets   Ticket[] @relation("AgentTickets")
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ServiceDesk { // A "Mesa"
  id        String   @id @default(uuid())
  name      String   // Ex: "Suporte N1", "Infraestrutura"
  tickets   Ticket[]
  createdAt DateTime @default(now())
}

model Ticket {
  id             String      @id @default(uuid())
  protocol       String      @unique // Ex: AP-2026-0001
  title          String
  description    String
  status         TicketStatus @default(OPEN) // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority       TicketPriority @default(MEDIUM) // LOW, MEDIUM, HIGH, CRITICAL
  
  requesterId    String      // Quem abriu (pode ser um cliente)
  requester      User        @relation("RequesterTickets", fields: [requesterId], references: [id])
  
  agentId        String?     // Quem está atendendo
  agent          User?       @relation("AgentTickets", fields: [agentId], references: [id])
  
  serviceDeskId  String      // A Mesa responsável
  serviceDesk    ServiceDesk @relation(fields: [serviceDeskId], references: [id])
  
  // Campos de SLA (desnormalizados no ticket para velocidade de leitura no MVP)
  responseDeadline DateTime?
  resolveDeadline  DateTime?
  
  comments       Comment[]
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Comment { // Timeline / Interações
  id        String   @id @default(uuid())
  content   String
  isInternal Boolean @default(false) // true = nota interna (invisível ao cliente)
  
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  
  createdAt DateTime @default(now())
}

// Enums
enum Role {
  ADMIN
  AGENT
  CLIENT
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## 4. Fluxo de Dados e Componentes Chave

**1. Autenticação e Acesso:**
   - API valida JWT. O Frontend guarda o token (Zustand).
   - Usuários `CLIENT` veem apenas seus próprios Tickets. `AGENT` e `ADMIN` veem a Fila completa (por Mesa).

**2. Abertura de Ticket (Fluxo do Cliente):**
   - Endpoint `POST /tickets`.
   - O Backend calcula automaticamente os prazos de `responseDeadline` e `resolveDeadline` baseando-se na prioridade informada na abertura (Regra de negócio básica de SLA injetada no Service).

**3. Visão de Fila (Fluxo do Agente):**
   - Endpoint `GET /tickets?serviceDeskId=X&status=OPEN`.
   - Retorna paginação e os dados básicos. Frontend React renderiza a tabela/painel.
   - Ao clicar no ticket, `GET /tickets/:id` traz a Timeline (`Comment[]`) inteira.

**4. Atendimento e SLA:**
   - Agente faz `PATCH /tickets/:id` para mudar status (Ex: para `IN_PROGRESS`).
   - A primeira resposta do Agente (via `POST /tickets/:id/comments`) deve marcar o tempo de resposta.

## 5. Plano de Deploy / Devops
- `Dockerfile` e `docker-compose.yml` baseados no que já temos no monorepo.
- Variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`) padronizadas.

---

**Próximos Passos:**
Se este desenho (Spec) estiver aprovado, invocaremos a skill `writing-plans` para gerar a divisão exata de tarefas (que arquivos criar, quais testes TDD fazer primeiro, etc).
