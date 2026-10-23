# SPEC — Revisão geral do painel de Tickets (DMTE-78 / DMTE-137)

Tier 3. Autor: aponta_architect. Data: 2026-10-23. Sem código de implementação nesta fase.

## 1. Contexto

A paridade base com o TiFlux já está em produção (PRs #83, #85, #87, #88: Kanban por estágio da mesa, seletor de Mesa, título de aba `#protocolo - título`). Em 2026-10-20 o Alfredo pediu uma revisão geral do painel `apps/web/src/pages/TicketsPage.tsx`:

1. Remover o modo Grade. Ficam Lista e Kanban.
2. Layout superior no padrão TiFlux (título + alternância à esquerda; busca + Busca avançada à direita).
3. Busca avançada absorve o painel de filtros atual.
4. Lista com "Agrupar por" e "Exibir colunas".
5. Kanban com filtro de Mesa, filtro de usuários (avatar redondo), card redesenhado, Ordenar e Configurações.
6. "Abrir nova aba" abre uma aba **dentro do sistema**.

Restrições decididas: sem apontamento inline no card (só abrir o ticket); sem Grade; UI em pt-BR.

## 2. Benchmark no TiFlux real (logado, 2026-10-23)

Feito com `agent-browser` em `https://app.tiflux.com/v/`. Nenhum registro foi criado ou alterado; só leitura.

### 2.1 Shell e abas internas
- Barra de abas no topo da área de conteúdo (ex.: `Tickets` | `Busca avançada` | `Kanban`), cada uma com botão de fechar (X). Abrir "Busca avançada" ou um ticket cria uma aba nova **dentro do app** (rota `/v/ticket_advanced_search`), sem abrir janela do navegador. É esse o comportamento do "abrir nova aba" pedido.
- Campo global "Número do ticket" no cabeçalho.

### 2.2 Tela Tickets, Lista (`/v/` → menu Tickets)
- Topo: título **Tickets** + alternância segmentada **Lista | Kanban** à esquerda; **Busca avançada** (botão) à direita. Na Lista há ainda campo **Buscar** com ícone.
- Atalhos: Pré-tickets, Autorizações (badge numérico), Tickets em revisão, Tickets fechados. (Fora do escopo desta revisão; ver §9.)
- Barra de filtros: **Filtros** (presets), chip do filtro ativo ("Todos abertos") com **Redefinir filtro**, **Agrupar por**, **Exibir colunas**.
- Tabela agrupada: linha de grupo colapsável com contador, ex. `BMC MAQUINAS (C) - (30)`.
- **Agrupar por** (opções observadas): Área do catálogo, Catálogo de serviços, Cliente, Criado em, Estágio, Grupo de recursos, Item do catálogo, Mesa de serviço, Prioridade, Recurso, Responsável, Solicitante, Status, Ticket pai, Grupo de tickets. Seleção única (check ao lado). Por padrão o agrupamento observado foi Cliente.
- **Exibir colunas**: campo de busca + lista "Selecionadas" (reordenável) + seções expansíveis.
  - Padrões, **ligadas por padrão**: Número, Título, Cliente, Origem, Prioridade, Status, Estágio.
  - Padrões, desligadas: Vencimento do estágio, Vencimento de atendimento, Vencimento de solução, Nome do recurso, Grupo de recursos, Mesa de serviço, Nome/Email/Telefone/Ramal do solicitante, Última resposta, Responsável, Item do catálogo, Área do catálogo, Catálogo de serviços, Criado em, Criado por, Atualizado em, Duração.
  - Seções de campos customizados da conta (Categoria: Estimativa, Previsão de Entrega, Tipo de Atendimento; e outras). Campos customizados do TiFlux **não** existem no Aponta e ficam fora.
- **Filtros** (presets "Padrões"): Todos abertos, Atendimento vencido (hoje/amanhã/depois), Vencimento de SLA (hoje/amanhã/depois), Aguardando resposta (todos/meus), Meus tickets; mais criação de filtro customizado.

### 2.3 Busca avançada (`/v/ticket_advanced_search`)
Título "Busca avançada" com contador de resultados (0 antes de buscar). Campos, na ordem:
1. **Data**: seletor Abertura | Fechamento + intervalo (data inicial → final). Padrão observado: 1º dia do mês corrente até hoje.
2. Número do ticket (texto).
3. Título (texto).
4. Status (select; opções observadas: Abertos, Fechados).
5. Cliente (select pesquisável).
6. Solicitante (texto).
7. Atendente (select).
8. Mesa de serviço (select).
9. Estágio (select, **desabilitado até escolher a Mesa**, pois estágio pertence à mesa).
10. Catálogo de serviços, Área do catálogo, Item do catálogo (selects).
11. Identificador único do e-mail (texto).
12. Link recolhível **Filtros adicionais** (campos customizados da conta).
13. Botão **Buscar**.
O resultado é exibido na própria Lista (aba Tickets) com os filtros aplicados.

### 2.4 Kanban
- Topo: Tickets + Lista | Kanban; **Busca avançada** à direita.
- Barra: botão **Mesa: <nome>** (dropdown com busca e seção FAVORITAS: Avulso, Contrato, Empreito; check na ativa); **Filtrar** (dropdown com busca de propriedade); **fila de avatares redondos** dos usuários presentes nos tickets (clicar filtra; iniciais coloridas quando sem foto); **Buscar**; **Ordenar**; ícone **tune** (Configurações).
- **Filtrar**: Não atendido, Aguardando resposta de, Pré-apontamentos, Reabertos, SLA pausado, SLA de solução (não vencido/vencido), SLA de atendimento (não vencido/vencido), Vencimento do SLA de solução, Vencimento do SLA de atendimento, Cliente, Status, Estágio, Prioridade, Data de criação, Data de atualização.
- **Ordenar** ("Ordenar os cards por", cada item com setas asc/desc, mais "Limpar ordenação"): Título, Número, Responsável, Cliente, Prioridade, Vencimento de solução, Vencimento de atendimento, Data de criação, Status, Data de atualização.
- **Configurações** (ícone tune): *Configurações de visualização*: **Agrupar por** (Estágio [padrão], Status, Responsável, Prioridade) e **Exibir campos** ("5 de 10"); *Configurações do Kanban*: "Permitir abertura rápida de ticket" (toggle, vale para todas as mesas).
- **Exibir campos**: obrigatórios Título e Número; opcionais Responsável (on), Cliente (off), Cumprimento SLA (on), Tempo no estágio, Data de criação, Data de última atualização; "Tag" (on) com escolha Status (padrão) ou Prioridade.
- Colunas = estágios da mesa, com contador, botão de recolher (`first_page`) e "Abrir novo ticket" no rodapé.
- **Card**: `#código` (link, cor de destaque) no topo esquerdo; ações no topo direito (play de apontamento e menu ⋮, **ambos fora de escopo no Aponta**); título em até 2 linhas com reticências; tag de status (borda cinza, texto); avatar pequeno do responsável no canto inferior direito; chips de SLA (ícone + tempo, vermelho se vencido, verde se ok); indicador de última resposta.

### 2.5 RBAC / visibilidade (baseline)
Com a conta de benchmark (perfil de gestão) não é possível observar outros papéis no TiFlux. A baseline de segurança vem do próprio Aponta (`TenantHelper.getTicketWhere` e `aponta-rbac-workflows.md`) e **não muda** nesta revisão:

| Perfil | Lista/Kanban | Busca avançada | Observações |
| --- | --- | --- | --- |
| ADMIN | todos os tickets | todos os filtros; Cliente, Atendente e Mesa sem restrição | |
| AGENT_MASTER / AGENT | tickets das mesas em que atuam (+ cross-desk) | filtros Mesa e Estágio listam só mesas permitidas; Atendente lista agentes dessas mesas | |
| CLIENT_MASTER | tickets da própria organização | campo **Cliente** oculto/fixo na organização; Solicitante restrito à org | |
| CLIENT | só os próprios | campos Cliente, Solicitante e Atendente ocultos; sem Kanban (mantém trava atual) | |

Regra: o filtro vai sempre para a API e a API sempre aplica o escopo do papel antes dos filtros. A UI só esconde campos. Os endpoints auxiliares das listas de Cliente/Atendente/Mesa devem respeitar o mesmo escopo.

## 3. Estado atual do Aponta (resumo)
- `TicketsPage.tsx` (687 linhas): `ViewMode = 'list' | 'kanban' | 'grid'`; Grade usa `EzEntityGrid` + `useUserScreenConfig('tickets')` (viewMode GRID/FORM, colunas, densidade); filtros em `TicketFilters.tsx` e `EzFilterDrawer`; links de ticket com `target="_blank"` em `TicketsPage.tsx`, `TicketCard.tsx`.
- `TicketKanban.tsx` (653 linhas) já agrupa por estágio da mesa e tem seletor de Mesa.
- `TicketQueryDto` (API) suporta: search, page, limit, serviceDeskId, organizationId, status, priority, mine, unassigned, paused, overdue, notClosed. **Não** suporta: intervalo de datas, número, título, solicitante, atendente, estágio, ordenação.
- `AppLayout` renderiza só `<Outlet />`; não existe barra de abas internas.
- `User` não tem campo de avatar/foto.

## 4. Decisões de arquitetura

D1. **Remover Grade** por completo: tipo `ViewMode`, botão `tickets-viewmode-grid`, `EzEntityGrid`/`EzEntityToolbar` de tickets, `ScreenConfig` do modo FORM/GRID para tickets. A Lista passa a ser uma tabela própria agrupada (D4). Preferências antigas `tickets` em `useUserScreenConfig` são ignoradas e migradas (valor desconhecido cai no padrão).

D2. **Abas internas (workspace tabs)**. Novo `TabsProvider` + `TabBar` em `AppLayout`, estado persistido em `sessionStorage`. Cada aba = `{ id, path, title }`, navegação por react-router (sem recarregar). Regras: aba fixa "Tickets"; abrir ticket, Busca avançada e Novo ticket criam/ativam aba (sem duplicar o mesmo path); fechar com X; fechar a ativa vai para a vizinha; título do ticket `#protocolo - título` (reusa o efeito atual de `document.title`). Substitui todos os `target="_blank"` de **navegação interna** de tickets (`TicketsPage`, `TicketCard`, Kanban, listas do Dashboard). Links externos (anexos, URL do cofre) continuam em nova aba do navegador. Ctrl/Cmd+clique continua abrindo no navegador (comportamento nativo).

D3. **Cabeçalho da página**: componente `TicketsHeader`: esquerda `Tickets` + `EzSegmented` Lista | Kanban (CLIENT só vê Lista); direita campo Buscar (texto livre `search`) + botão **Busca avançada**. Modo na URL (`?view=list|kanban`), padrão Kanban para agentes e Lista para clientes.

D4. **Busca avançada** = rota `/tickets/search` (abre como aba interna). Formulário com os campos de §2.3 (menos campos customizados e "Identificador único do e-mail"): Data (Abertura|Fechamento + intervalo), Número, Título, Status (todos os `TicketStatus` + atalhos Abertos/Fechados), Cliente (organização), Solicitante (texto: nome/e-mail), Atendente, Mesa de serviço, Estágio (desabilitado até escolher Mesa), **Prioridade** (já existia no painel antigo, mantida), os presets rápidos Meus / Não atendidos / Pausados / Vencidos (movidos para "Filtros adicionais", recolhível) e **Buscar** / **Limpar**. Buscar navega para `/` com os filtros na query string (fonte única de verdade, como hoje) e exibe contador de resultados. O painel `TicketFilters` + `EzFilterDrawer` atuais são removidos da página de Tickets (migrados, não duplicados).

D5. **Lista**: tabela agrupável. Grupo colapsável com contador. "Agrupar por" (Cliente, Estágio, Status, Prioridade, Responsável, Mesa de serviço, Solicitante, Nenhum). "Exibir colunas" com lista de checkboxes. Colunas padrão ligadas (espelhando TiFlux): Número, Título, Cliente, Origem, Prioridade, Status, Estágio. Colunas opcionais: Mesa de serviço, Responsável, Solicitante, Criado em, Atualizado em, Vencimento de atendimento, Vencimento de solução, Última resposta. Preferência (agrupamento + colunas + ordem) persistida por usuário com `useUserScreenConfig`. Ordenação por clique no cabeçalho da coluna. Agrupar por é feito **no servidor por página** quando possível; ver R1.

D6. **Kanban**: manter agrupamento por estágio da mesa. Adicionar: (a) fila de **avatares redondos** (iniciais coloridas, sem foto; sem alteração de schema) dos agentes presentes nos tickets da mesa, clique alterna filtro por agente (multi); (b) **Ordenar** (campos de §2.4 que existirem no Aponta: Título, Número, Responsável, Cliente, Prioridade, Vencimento de solução, Vencimento de atendimento, Data de criação, Status, Data de atualização; asc/desc; limpar); (c) **Configurações** (popover): Agrupar por (Estágio padrão, Status, Responsável, Prioridade) e Exibir campos (Título/Número fixos; Responsável, Cliente, Cumprimento SLA, Tempo no estágio, Data de criação, Data de atualização; Tag Status|Prioridade); (d) campo Buscar; (e) manter Mesa. Toggle "abertura rápida" fica fora (ver §9). Preferências por usuário via `useUserScreenConfig('tickets-kanban')`.

D7. **Card redesenhado** (`TicketKanbanCard`): linha 1 `#protocolo` em destaque (link interno) e menu ⋮ **só com "Abrir ticket"** e "Abrir em nova aba interna" (sem play/apontamento); linha 2 título em 2 linhas com `line-clamp-2` e reticências (descrição curta como `title` tooltip); faixa com **Cliente** (organização do solicitante, truncado) e **Status** como tag (ou Prioridade conforme configuração); rodapé com avatares pequenos (24px, sobrepostos estilo Trello) do responsável e, se houver, de outros envolvidos; chips de SLA (resposta/solução) reutilizando `SlaBadge`. Remove o "ponto" colorido e o layout atual. Acessibilidade: card inteiro é link, foco visível, `aria-label` com protocolo e título. Visual segue o DS (`components/ds`, tokens existentes) com sombra leve e raio 8px; sem cores novas fora do DS.

D8. **API**. Estender `TicketQueryDto`/`findAll` (compatível com os chamadores atuais): `number` (protocolo contains), `titleContains`, `requesterQuery` (nome/e-mail contains), `agentId`, `stageId`, `dateField` (`createdAt`|`closedAt`) + `dateFrom`/`dateTo`, `sortBy` (whitelist) + `sortDir`, `agentIds` (lista, para o filtro de avatares). Filtros sempre **ANDados depois** de `TenantHelper.getTicketWhere`. `closedAt`: o schema não tem data de fechamento; usar o `TicketAudit` da transição para `CLOSED`/`RESOLVED` via subquery, ou adicionar `closedAt DateTime?` preenchido na transição (com backfill pela auditoria). Ver Decisão aberta Q1. Endpoints auxiliares: `GET /service-desks` (já existe), `GET /organizations` e lista de agentes com escopo por papel. Confirmar o que já existe antes de criar novos.

D9. **Sem Clarify bloqueante**: premissas assumidas estão em §9 e listadas na entrega; qualquer objeção do Alfredo vira ajuste de tarefa, não de arquitetura.

## 5. Critérios de aceite (testáveis)
- AC1: `/` não mostra botão nem rota de Grade; só Lista e Kanban (teste: `queryByTestId('tickets-viewmode-grid')` é null).
- AC2: Cabeçalho tem "Tickets", alternância Lista/Kanban, campo Buscar e botão Busca avançada, nessa disposição; CLIENT não vê o Kanban.
- AC3: Clicar em Busca avançada abre aba interna `/tickets/search` sem abrir janela do navegador (teste: `window.open` não chamado; nenhum `<a target="_blank">` para rotas internas de ticket).
- AC4: Busca avançada tem todos os campos de D4; Estágio desabilitado sem Mesa; Buscar aplica filtros e mostra resultados + contador; Limpar zera.
- AC5: Painel de filtros antigo não existe mais em `/`.
- AC6: Lista agrupa por Cliente/Estágio/Status/Prioridade/Responsável/Mesa/Solicitante/Nenhum, grupos colapsam e mostram contador; colunas padrão são Número, Título, Cliente, Origem, Prioridade, Status, Estágio; "Exibir colunas" liga/desliga e persiste após recarregar.
- AC7: Kanban: avatares redondos filtram por agente (clique alterna); Mesa, Ordenar e Configurações funcionam; ordenação asc/desc/limpar altera a ordem dos cards em cada coluna.
- AC8: Card exibe código, título com reticências (2 linhas), cliente + status, avatares pequenos; não há botão de apontamento; clicar abre o ticket em aba interna.
- AC9: Abas internas: abrir 2 tickets cria 2 abas; reabrir o mesmo ativa a existente; fechar a ativa vai para a vizinha; título da aba `#protocolo - título`; sobrevive a refresh na mesma sessão.
- AC10: RBAC: CLIENT só retorna os próprios tickets mesmo forçando `agentId`/`organizationId` na query; CLIENT_MASTER limitado à organização; AGENT só mesas permitidas (testes de API por papel).
- AC11: Toda a UI nova em pt-BR; `lint`, `typecheck`, testes unitários e `nx run web-e2e:e2e` verdes.

## 6. Tarefas discretas (ordem sugerida)
T1. Remover Grade: tipo, botão, `EzEntityGrid`/toolbar/modal de config da tela, testes e e2e que referenciam Grade; migrar `useUserScreenConfig('tickets')`. (RED: teste AC1.)
T2. Infra de abas internas: `TabsProvider`, `TabBar` no `AppLayout`, persistência `sessionStorage`, hook `useOpenInTab`; substituir `target="_blank"` internos em `TicketsPage`, `TicketCard`, `TicketKanban`, Dashboard. (AC3, AC9)
T3. API: estender `TicketQueryDto` e `findAll` (D8) + testes unitários por papel; decidir `closedAt` (Q1) e migration se aprovada (usar skill nx-nestjs-prisma-workspace; migration via `prisma migrate`, sem `db push`).
T4. API: garantir endpoints de apoio com escopo por papel (organizações, agentes, estágios por mesa). Testes.
T5. `TicketsHeader` (D3) com URL `?view=`.
T6. Página/rota `TicketAdvancedSearchPage` (D4) + migrar presets e filtros; remover `TicketFilters`/`EzFilterDrawer` da página de Tickets (reaproveitar subcomponentes). Testes de componente + e2e do fluxo busca → resultados.
T7. Lista nova (D5): tabela agrupável, Agrupar por, Exibir colunas, ordenação por cabeçalho, persistência. Testes.
T8. Kanban: filtro por avatares, Ordenar, Configurações, Buscar (D6). Testes.
T9. Card redesenhado (D7), `TicketKanbanCard` + testes + story do Storybook se o DS tiver padrão para isso.
T10. Revisão independente (subagente reviewer com E2E completo), correção de achados Importantes+, deploy e smoke test em produção conforme `references/push-ci-cd-is-mandatory.md`.
Dependências: T1, T2, T3 podem ir em paralelo; T5-T9 dependem de T1; T6 e T7/T8 dependem de T3; T9 depende de T2.

## 7. Riscos e pitfalls
- R1. Agrupar por no servidor vs cliente: com paginação de 20 itens o grupo fica incompleto. Recomendação: no modo Lista agrupado, usar `limit` maior (ex. 200) ou agrupar apenas o que a página trouxe e mostrar o aviso "Agrupando os N tickets desta página". Decidir na T7.
- R2. Prisma 7 / Nx: migrations via `prisma migrate dev` + `generate`; cuidado com tsconfig do workspace (ver skill nx-nestjs-prisma-workspace). Não usar `db push` em produção.
- R3. CI de produção: deploy já teve conflito `aponta-prod-migrate-1`; seguir o procedimento de `cd-deploy-timeout.md`.
- R4. Rodar testes web em foreground com timeout curto; órfãos de `node` e lock do Nx daemon já causaram travas neste projeto.
- R5. Abas internas com react-router: não montar várias páginas ao mesmo tempo (só a ativa renderiza), senão custo de memória e queries duplicadas.

## 8. Fora de escopo
Apontamento inline/play no card; modo Grade; campos customizados do TiFlux; filtros salvos customizáveis; atalhos Pré-tickets/Autorizações/Em revisão/Fechados.

## 9. Premissas assumidas (veto do Alfredo possível)
- Q1. **Data de Fechamento** na Busca avançada exige uma data de fechamento. Premissa: adicionar `Ticket.closedAt DateTime?` (migration + backfill pela auditoria). Alternativa sem schema: derivar da auditoria.
- Q2. Sem foto de usuário no schema: avatares usam iniciais coloridas. Upload de foto fica para outra issue.
- Q3. Os atalhos Pré-tickets/Autorizações/Revisão/Fechados do TiFlux ficam de fora (já decidido em DMTE-78; "Tickets fechados" é coberto por Status = Fechados na Busca avançada).
- Q4. "Abertura rápida de ticket" do Kanban (toggle) não entra agora.
- Q5. Presets (Meus, Não atendidos, Pausados, Vencidos) ficam em "Filtros adicionais" da Busca avançada, e continuam acessíveis por link do Dashboard (`?mine=true` etc.).
