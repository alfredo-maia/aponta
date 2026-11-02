# Categoria e Tipo de atendimento do ticket — cadastro, vínculo e edição

- Entrega: DMTE-106 · GitHub #105 · Tier 2 (Triagem DMTE-203, aprovada) · Etapa Architect: DMTE-204
- Estado: SPEC para o Developer (DMTE-205). Nenhuma linha de produto foi escrita nesta etapa.

## Problema e resultado

As abas **Categoria** e **Tipo de Atendimento** do detalhe do ticket mostram texto fixo ("Remoto", "Atendimento Remoto") em `apps/web/src/pages/TicketDetailPage.tsx` (~L197-260). `model Ticket` (`apps/api/prisma/schema.prisma`) não tem campo nem relação para categoria/tipo, e não existe model para os cadastros.
Resultado: cada mesa mantém seus cadastros; o atendente escolhe categoria e tipo no ticket; o valor persiste, aparece no detalhe e fica auditado.

## Decisão: catálogo POR MESA (ServiceDesk) — não global

Fonte e motivo (decisão de arquitetura, tomada nesta etapa conforme a atividade):
- As seções `CATEGORY` e `SERVICE_TYPE` já são ligadas/desligadas por mesa (`ServiceDeskTicketSection`, `desk-defaults.ts`). Catálogo global com liga/desliga por mesa seria incoerente.
- Prioridades, estágios e seções são catálogos por mesa (`ServiceDeskPriority`, `TicketStage`, `ServiceDeskTicketSection`); o pai pede o mesmo padrão ("catálogo e prioridades por mesa").
- Reversível: virar global depois é migração aditiva. Se o responsável de produto preferir global, avisar ANTES do Developer iniciar; o SPEC é atualizado e as ACs mudam em AC-01/02.

## Escopo

Dentro: cadastro (CRUD) de categorias e de tipos por mesa; vínculo opcional no ticket; edição no detalhe; auditoria; limpeza do vínculo ao trocar a mesa do ticket.
Fora (exclusões): seleção na abertura do ticket (`CreateTicketDto`); hierarquia/subcategoria; relatórios/filtros por categoria; SLA ou regras por categoria; coluna "Estimativa" da aba Categoria (segue "Sem dados"); mudança no RBAC, ciclo de vida do ticket, ou benchmark (não repetido); aba/portal do cliente (abas seguem ocultas para `isClient`).

## Contratos

### Schema Prisma (aditivo, nullable, sem backfill)
```
model ServiceDeskCategory {
  id String @id @default(uuid()); serviceDeskId String
  serviceDesk ServiceDesk @relation(fields:[serviceDeskId], references:[id], onDelete: Cascade)
  name String; active Boolean @default(true); sortOrder Int @default(0)
  createdAt DateTime @default(now()); tickets Ticket[]
  @@unique([serviceDeskId, name]) @@index([serviceDeskId])
}
model ServiceDeskServiceType { /* idêntico, relação Ticket[] */ }
Ticket += categoryId String?, category ServiceDeskCategory? (onDelete: Restrict),
          serviceTypeId String?, serviceType ServiceDeskServiceType? (onDelete: Restrict)
```
Migração nova em `apps/api/prisma/migrations` (somente CREATE TABLE + ADD COLUMN nullable + índices); produção via `migrate deploy` revisada; sem `db push`/reset. Tickets existentes ficam com `null` ("Não definido"). Unicidade do nome case-insensitive: normalizar com trim e comparar sem caixa no service (a constraint cobre a igualdade exata).

### API (NestJS; controller só transporte, regra no service — padrão `ticket-stages.service.ts`)
Em `service-desks.controller.ts`, novos serviços `ServiceDeskCatalogService` (ou dois, no mesmo módulo):
- `GET /service-desks/:id/categories` e `/service-types` (`?active=true` opcional; ordenado por `sortOrder`, `name`) — autenticado como `GET :id/stages`.
- `POST`, `PATCH /:itemId` (nome, active, sortOrder), `DELETE /:itemId` — `MANAGE_SERVICE_DESKS`.
- DELETE: 409 com mensagem pt-BR "Em uso por N ticket(s); inative em vez de excluir" se há tickets; senão exclui. Nome vazio → 400; duplicado na mesa → 409. Item de outra mesa → 404.
- `PATCH /tickets/:id` (`EDIT_TICKETS`, já existente): `UpdateTicketDto` ganha `categoryId?` e `serviceTypeId?` (string UUID ou `null` para limpar; usar `@ValidateIf` para aceitar null). Em `TicketsService.update`: após `assertListedMutation`, o item precisa existir, pertencer a `existing.serviceDeskId` e estar `active` (ao SETAR um valor diferente do atual; manter um item hoje inativo é permitido). Violação → 400. Auditoria `CATEGORY_CHANGED` / `SERVICE_TYPE_CHANGED` (prevVal/newVal = id ou vazio), como `PRIORITY_CHANGED`.
- `GET /tickets/:id` (`findOne`) passa a incluir `category {id,name,active}` e `serviceType {id,name,active}`.
- `changeServiceDesk` (`tickets.service.ts` ~L1337): ao mudar a mesa, `categoryId`/`serviceTypeId` = null (mesma regra do `stageId` reinicializado), com os valores anteriores citados na auditoria `SERVICE_DESK_CHANGED` ou em auditorias próprias. **Risco coberto pelo AC-05.**

### Autorização e tenant
Sem permissão nova: gerir catálogo = `MANAGE_SERVICE_DESKS`; vincular ao ticket = `EDIT_TICKETS` + `assertListedMutation` (regra de mesa/listados). O isolamento por organização/mesa continua no backend: a validação "item pertence à mesa do ticket" impede ligar item de outra mesa/tenant. Nada depende só de esconder controles na UI.

### UI (DS existente; sem novo design system)
Referência: pedido do pai + padrão visual já aprovado de `MesaStagesEditor.tsx` (lista editável por mesa) e das abas atuais do `TicketDetailPage`. Não há protótipo novo nem benchmark (não repetir, conforme a atividade).
- `ServiceDesksPage.tsx` (`mesaTabs`): duas abas novas "Categorias" e "Tipos de atendimento", cada uma com um editor reutilizável de lista (novo componente `MesaCatalogEditor`, mesmos tokens/controles do `MesaStagesEditor`): adicionar, renomear, ativar/inativar, reordenar opcional (`sortOrder`), excluir com confirmação e mensagem de 409.
- `TicketDetailPage.tsx`: remover "Remoto" e "Atendimento Remoto". Aba Categoria: `select` com as categorias ativas da mesa + opção "Não definido"; aba Tipo de Atendimento idem. Salvar via `PATCH /tickets/:id` (hook TanStack Query existente, invalidando o ticket). Sem `EDIT_TICKETS`: somente leitura. Item atual inativo continua exibido e rotulado "(inativo)". Estados: carregando, vazio ("Nenhuma categoria cadastrada nesta mesa"), erro de salvamento, sucesso. Mantém as condições `!isClient && sectionOn(...)`. "Previsão de Entrega" fica como está.
- Storybook: o repo já tem stories em `components/contracts/`; criar story do `MesaCatalogEditor` (estados: vazio, com itens, inativo, erro 409) somente se o Developer confirmar que o padrão se aplica a `Mesa*`; senão cobrir por teste de componente (como `MesaStagesEditor.test.tsx`).

## Critérios e matriz AC → verificação

| AC | Comportamento | Verificação (RED primeiro) | Evidência esperada |
|---|---|---|---|
| AC-01 | Com `MANAGE_SERVICE_DESKS`, criar/renomear/inativar/excluir categoria da mesa; nome vazio→400, duplicado→409; sem permissão→403; item de outra mesa→404; excluir em uso→409 | `service-desk-catalog.service.spec.ts` + `service-desks.controller.spec.ts` | testes verdes, casos negados |
| AC-02 | Idem para tipos de atendimento | mesmos specs | idem |
| AC-03 | `PATCH /tickets/:id` grava/limpa `categoryId`/`serviceTypeId`; item de outra mesa ou inativo (novo) →400; sem `EDIT_TICKETS`→403; ticket de outra org inacessível; gera auditoria | `tickets.service.spec.ts`, `tickets.controller.spec.ts` | testes + registro de auditoria |
| AC-04 | Abas leem `category`/`serviceType` reais, editam via select, sem texto fixo; estados vazio/erro/inativo/somente leitura | `TicketDetailPage` test (RTL) + `MesaCatalogEditor.test.tsx`; story opcional | testes verdes; busca provando que "Remoto" fixo saiu |
| AC-05 | Trocar a mesa do ticket zera categoria e tipo | `tickets.service.spec.ts` (changeServiceDesk) | teste verde |
| AC-06 | Migração aditiva: tickets existentes continuam abrindo com vínculo `null`; seções desligadas continuam ocultando a aba | migração em banco isolado + teste do detalhe | `prisma migrate` aplicado no banco isolado; teste de seção |

Testes devem exercitar o comportamento acima (resposta HTTP/estado de tela), não a estrutura interna. Antes de revisão: lint, typecheck e testes de `api` e `web` afetados (Nx affected com base/head reais); E2E do detalhe do ticket se houver suíte pertinente (mudança de schema + fluxo do ticket). QA repete com cache desativado.

## Riscos
- Troca de mesa deixaria vínculo inválido → AC-05.
- Exclusão com FK Restrict → tratada com 409 amigável (AC-01/02).
- Migração em produção: só `migrate deploy`; deploy/CD seguem com o usuário.
- `UpdateTicketDto` com null: validar que o `ValidationPipe` global aceita `null` com `@ValidateIf`.

## Pendências
Nenhuma que bloqueie o Developer. Confirmação opcional do responsável de produto: catálogo por mesa (decisão acima). Seleção na abertura do ticket e relatórios ficam como possíveis entregas futuras, não ativadas.
