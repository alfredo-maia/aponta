# Catálogo de atendimento sem menções a SAB e Zydon

Identidade: DMTE-484, issue dmrepositorio/aponta#202, Tier 1, ciclo 2026-11-09/2026-11-22. Decisões humanas (Multica DMTE-484, 11/11/2026): remover só as menções; manter as 8 categorias e os 18 itens; nada é removido nem desativado; não há outros nomes a tratar.

## Situação atual (código observado)
`apps/api/prisma/seeds/catalogo-atendimento.json` (DMTE-456) cita "SAB" na descrição de "Automação, Integração e APIs" e "Zydon" na de "Vendas / Pedido de Venda / Faturamento / Portal B2B". `CreateTicketPage.tsx` exibe a descrição do item. O seed (`seed-catalog.ts`) faz upsert por nome/título: reexecutá-lo atualiza as descrições sem apagar nada.

## Situação desejada
Descrições neutras, sem os dois nomes. Estrutura do catálogo intacta.

## Decisões
- Só o JSON muda: "(SAB)" sai da descrição de Automação; "(Zydon)" sai da de Vendas (o texto "portal de vendas B2B" fica). Sem mudança de schema, de seed ou de UI.
- Termos como App Center/Sankhya Place, EDI, Wildfly, Gadget e PDV ficam: são do produto Sankhya ou genéricos, e o responsável não indicou outros.
- Produção: o usuário reexecuta `api:catalog-seed` depois do deploy; o upsert corrige as duas descrições. Fora do CI.

## Acceptance criteria
- AC-01: nenhuma descrição de item do JSON contém "SAB" nem "Zydon".
- AC-02: o JSON mantém as 8 categorias e os 18 itens, com os mesmos títulos, prioridades e ícones de antes.

## Testes
`apps/api/prisma/seed-catalog.spec.ts`, bloco `catalogo-atendimento.json (DMTE-484)` (lê o JSON direto; seam existente do DMTE-456). Comando: `pnpm exec nx test api --testFile=seed-catalog.spec.ts`. AC-02 fixa a lista de títulos, prioridades e ícones atuais, então um item apagado ou renomeado falha.

## Riscos e exclusões
Risco baixo: dados estáticos. Fora do escopo: schema, lógica do seed, remoção/desativação de itens, execução em produção, deploy.

## Ticket único
T1: editar o JSON e acrescentar os testes (AC-01, AC-02). Sem bloqueadores. Refs #202.
