# Exclusão de cliente: bloquear só com contrato ativo/ticket aberto; senão inativar

Identidade: DMTE-481, Tier 1, ciclo 2026-11-09/2026-11-22, issue GitHub #199. Bug confirmado pelo pedido do Alfredo na issue Multica; sem grill-with-docs/to-spec/to-tickets (bug pequeno com critérios confirmados).

## Situação atual (código observado em 3abe1f0)
- `OrganizationsPage.tsx` `handleDelete`: chama `updateOrgMutation`, que faz `PATCH /organizations/${detailOrgId}`; na grade `detailOrgId` é `null`, então a lixeira não age.
- `organizations.service.ts` `remove`: `prisma.organization.delete`; Contract e Ticket têm FK sem cascade, então o delete estoura 500.

## Decisões
- `DELETE /organizations/:id` deixa de apagar: recusa com `ConflictException` (409) quando há contrato `active=true` ou ticket fora de RESOLVED/CLOSED (solicitante do cliente ou `commercialOrganizationId`); senão define `active=false` e devolve o cliente.
- A lixeira avisa que o cliente será apenas inativado, chama `DELETE` por cliente selecionado e mostra a mensagem da API quando recusado.
- Interpretação registrada: "contrato ativo" = `Contract.active=true`; "ticket aberto" = status fora de RESOLVED/CLOSED.

## Acceptance criteria
- AC-01: `OrganizationsService.remove` lança `ConflictException` com mensagem quando o cliente tem contrato com `active=true`, sem alterar o cliente.
- AC-02: `OrganizationsService.remove` lança `ConflictException` com mensagem quando há ticket aberto do cliente (solicitante ou cliente comercial), sem alterar o cliente.
- AC-03: sem restrições, `OrganizationsService.remove` define `active=false`, não chama `organization.delete` e devolve o cliente inativado.
- AC-04: na tela Clientes, a lixeira com cliente selecionado confirma avisando que será apenas inativado, chama `DELETE /organizations/:id` e mostra a mensagem de erro da API quando a exclusão é recusada.

## Testes
`organizations.service.spec.ts` (api, Jest, Prisma mockado); `OrganizationsPage.test.tsx` (web, Vitest). TDD real, RED por asserção.

## Riscos e exclusões
- RBAC inalterado (`MANAGE_CLIENTS_AND_RESOURCE_GROUPS`); consultas filtram pelo id do cliente, sem dado de outro tenant.
- Fora de escopo: exclusão definitiva de cliente, reativação em lote, outros vínculos além de contrato e ticket.
