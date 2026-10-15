## TicketStage por mesa (DMTE-41)

Estágios são o fluxo de trabalho configurável **dentro de cada `ServiceDesk`**. Status (Aberto/Fechado/…) continua separado. Sem cor, sem ativar/desativar, sem automações de entrada/saída (fora do corte).

### Modelo

- `TicketStage`: `serviceDeskId`, `name`, `position`, `isInitial`, `isFinal`
- `TicketStageTransition`: `fromStageId` → `toStageId` (possíveis estágios)
- `Ticket.stageId` (FK). Ticket novo recebe o estágio inicial da mesa.

O primeiro estágio (Pendente) e o último (Fechado) são fixos: editar nome e transições, sem mover nem excluir. Demais: criar, reordenar entre os dois, excluir se nenhum ticket estiver neles.

### Seed / migração

Cada mesa ganha Pendente (inicial, pos 0) e Fechado (final, pos 1), com transição Pendente → Fechado. Tickets `CLOSED`/`RESOLVED` vão para Fechado; o restante para Pendente.

### API (RBAC)

- `GET /service-desks/:id/stages` — autenticado
- `POST /service-desks/:id/stages` `{ name }` — ADMIN; insere antes do final
- `PATCH /service-desks/:id/stages/reorder` `{ ids }` — ADMIN; primeiro e último permanecem inicial/final
- `PATCH /service-desks/:id/stages/:stageId` `{ name?, transitionToIds? }` — ADMIN
- `DELETE /service-desks/:id/stages/:stageId` — ADMIN; recusa inicial, final ou em uso
- `PATCH /tickets/:id/stage` `{ stageId }` — AGENT/ADMIN; só transições permitidas. Destino final aplica `defaultClosedStatus` da mesa.

`GET /tickets/:id` inclui `stage` e `nextStages` para a DMTE-36 (select “Próximo estágio”).

### UI

Aba **Estágio** da tela Mesa (hoje “Em breve”): lista ordenável, + Estágio, editar nome e possíveis estágios. Não recria a entidade de mesa.
