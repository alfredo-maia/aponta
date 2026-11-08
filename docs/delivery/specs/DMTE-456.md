# Catálogo de atendimento: seed idempotente

Identidade: DMTE-456, issue alfredo-maia/aponta#147, Tier 1, ciclo 2026-10-26/2026-11-08. Alinhamento humano na issue Multica (respostas de 08/11/2026): mesa "Suporte Geral"; nenhum dado real de cliente no repositório; sem staging, os dados vão para produção; rito confirmado; `cat-hw`/`cat-sw` sem alteração.

## Situação atual (código observado)
`ServiceCatalogCategory` e `ServiceCatalogItem` (`apps/api/prisma/schema.prisma`), `GET /catalog` e `CreateTicketPage` já existem. Produção só tem duas categorias de teste (`cat-hw`/`cat-sw`). `apps/api/prisma/seed.ts` é de dev/E2E (cria "General Support").

## Situação desejada
Produção com 8 categorias e 18 itens reais de atendimento, derivados do histórico do TiFlux (2.590 chamados), carregados por um script idempotente que o usuário executa.

## Decisões
- Dados em `apps/api/prisma/seeds/catalogo-atendimento.json`, derivados do JSON de origem **sem** `examples`, `historical_count` e `avg_hours` (títulos de chamados reais podem conter dados de clientes). Cada item ganha um `icon` emoji, pois `CreateTicketPage` renderiza `icon` como texto.
- Script `apps/api/prisma/seed-catalog.ts`, alvo Nx `api:catalog-seed`. Não é parte de `seed.ts` (que é de dev/E2E).
- Upsert por `name` (categoria) e por `title` dentro da categoria (item); reexecução atualiza descrição, prioridade, mesa e ícone, sem duplicar.
- Mesa padrão: `Suporte Geral`, sobrescrevível por `CATALOG_SERVICE_DESK`. Se a mesa não existir, o script aborta sem escrever nada e não a cria.
- `cat-hw`/`cat-sw` e `KnowledgeCatalogItem` não são tocados.

## Acceptance criteria
- AC-01: o seed cria 8 categorias e 18 itens com título, descrição, prioridade, ícone e mesa conforme o JSON.
- AC-02: segunda execução não cria registros novos (mesmas contagens) e corrige campos alterados.
- AC-03: mesa ausente ou prioridade inválida aborta antes de qualquer escrita.
- AC-04: o JSON versionado tem 8 categorias, 18 itens, nenhum campo `examples` e só prioridades do enum `TicketPriority`.
- AC-05: categorias fora do JSON (ex.: `cat-hw`/`cat-sw`) não são alteradas.
- AC-06 (operacional, fora do CI): após o usuário rodar o script em produção, `GET /catalog` retorna as 8 categorias e 18 itens.

## Testes
`apps/api/prisma/seed-catalog.spec.ts` com Prisma em memória (seam: `seedServiceCatalog(prisma, data, desk)`), TDD real. Comando: `pnpm exec nx test api --testFile=seed-catalog.spec.ts`.

## Riscos e exclusões
Escrita em produção sem staging: mitigada por upsert idempotente, abort sem escrita parcial e execução pelo usuário. Fora do escopo: UI nova, mudança de schema/migração, RBAC (o script roda com acesso direto ao banco), `KnowledgeCatalogItem`, deploy.

## Ticket único
T1: JSON saneado + script + spec + alvo Nx + manifest (AC-01..AC-05). Sem bloqueadores. Refs #147.
