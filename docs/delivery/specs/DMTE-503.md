## Problem Statement

Quem usa a lista de Tickets não tem atalhos para os recortes que mais consulta. A captura que o Alfredo enviou, tirada do TiFlux, mostra quatro: Pré-tickets, Autorizações (com contador), Tickets em revisão e Tickets fechados. Hoje, para ver só os fechados ou só os tickets esperando aprovação, é preciso abrir a Busca avançada e montar o filtro, e ninguém vê de relance quantas autorizações esperam por liberação.

Identidade: DMTE-503 (Multica), Tier 2, ciclo 2026-11-09/2026-11-22. Origem: pedido do Alfredo na própria DMTE-503, com as decisões da rodada 1 de perguntas (Q1 a Q5 aceitas com "sim"; Q6 decidida pelo Alfredo). Os atalhos estavam fora do escopo desde a DMTE-427 (D2/Q2: "só entram se Alfredo pedir"); o pedido levanta essa exclusão apenas para os dois atalhos desta entrega.

## Solution

No modo Lista, uma fileira de atalhos logo abaixo do cabeçalho:

1. **Tickets fechados**: filtra a lista pelos tickets Resolvidos ou Fechados, o mesmo recorte do "Fechados" da Busca avançada. Aparece para todos os perfis.
2. **Autorizações**: filtra a lista pelos tickets em Aguardando Aprovação e mostra, como contador, quantos existem. Aparece só para ADMIN, AGENT_MASTER e CLIENT_MASTER, os perfis que podem liberar esses tickets.

Cada atalho liga e desliga um filtro da própria lista, fica na URL como os demais filtros e combina com Buscar e com os filtros já ativos. Um atalho por vez. O Kanban não muda.

## User Stories

1. Como atendente, quero um atalho "Tickets fechados" na lista, para ver os tickets encerrados sem abrir a Busca avançada.
2. Como atendente, quero clicar de novo no atalho ativo para desligá-lo, para voltar à lista anterior.
3. Como ADMIN, AGENT_MASTER ou CLIENT_MASTER, quero um atalho "Autorizações" na lista, para ver os tickets que esperam a minha liberação.
4. Como ADMIN, AGENT_MASTER ou CLIENT_MASTER, quero ver no atalho quantas autorizações existem, para saber sem clicar se há algo esperando.
5. Como atendente sem permissão de liberar, quero não ver "Autorizações", para não ter um atalho que não posso usar.
6. Como cliente (CLIENT), quero o atalho "Tickets fechados" na minha lista, para rever o que já foi encerrado.
7. Como usuário, quero que o atalho ativo fique destacado e apareça nos filtros ativos, para saber por que a lista está filtrada.
8. Como usuário, quero combinar o atalho com a busca por texto e com os demais filtros ativos, para refinar o recorte.
9. Como usuário, quero que o atalho ativo fique na URL, para recarregar a página ou compartilhar o link sem perdê-lo.
10. Como usuário de teclado e de leitor de tela, quero operar os atalhos por teclado e ouvir se estão ativos e o valor do contador, para usar a lista sem mouse.
11. Como usuário de celular, quero que os atalhos quebrem de linha sem rolagem horizontal, para usá-los em 390px.
12. Como Alfredo, quero Pré-tickets e Tickets em revisão registrados como pendentes, para descrever a regra de cada um em cards próprios.

## Implementation Decisions

Estado atual (código observado em `origin/main`, `7ae7110`):

- `closedOnly=true` na API de tickets já filtra RESOLVED e CLOSED, e só vale quando o pedido não traz `status`. A lista lê e grava `closedOnly` e `status` na URL, e os filtros ativos já exibem "Fechados" e "Status: Aguardando Aprovação".
- `TicketStatus.PENDING_APPROVAL` ("Aguardando Aprovação") existe; só ADMIN, AGENT_MASTER e CLIENT_MASTER podem tirar um ticket desse status (`changeStatus`).
- `TicketsPage` já decide por perfil (`isClient` é só o papel CLIENT) e só mostra os filtros ativos no modo Lista.

Decisões (confirmadas pelo Alfredo, salvo marca de proposta):

- D1 [Humano] Escopo: Tickets fechados e Autorizações no modo Lista. Pré-tickets e Tickets em revisão ficam fora e viram cards próprios, quando o Alfredo descrever a regra de cada um.
- D2 [Humano] "Tickets fechados" = RESOLVED e CLOSED, reaproveitando `closedOnly`.
- D3 [Humano] "Autorizações" = tickets em PENDING_APPROVAL. Visível só para ADMIN, AGENT_MASTER e CLIENT_MASTER.
- D4 [Humano] Clique liga e desliga um filtro da própria lista, na URL, combinável com Buscar e filtros ativos; um atalho por vez; o ativo fica destacado e aparece nos filtros ativos com a opção de redefinir.
- D5 [Humano] Só no modo Lista. O Kanban não muda. Para CLIENT aparece apenas "Tickets fechados".
- D6 [Proposta] Sem API nova, sem schema e sem permissão nova. O atalho Tickets fechados usa `closedOnly=true`; Autorizações usa `status=PENDING_APPROVAL`. Ligar um atalho troca `status` e `closedOnly` (o outro atalho desliga, e um `status` vindo da Busca avançada é substituído, porque a API ignora `closedOnly` quando há `status`; pelo mesmo motivo, ligar um atalho também desliga Abertos, Não atendidos, Pausados e Vencidos, que a API sobrepõe ao status. Achado da revisão interna; desligar o atalho limpa só o próprio filtro) e volta a página para 1. Os demais filtros ficam.
- D7 [Proposta] Estado do atalho derivado dos filtros, sem estado próprio: "Tickets fechados" ativo quando `closedOnly` está ligado; "Autorizações" ativo quando `status` é PENDING_APPROVAL. Assim, um link da Busca avançada ou do dashboard já abre com o atalho aceso.
- D8 [Proposta] Contador: uma consulta à lista de tickets com `status=PENDING_APPROVAL` e `limit=1`, lendo `meta.total`, sem os outros filtros ativos. O que o usuário já pode ver na lista é o que ele conta; nenhum dado novo é exposto. Só roda para os três perfis que veem o atalho. Oculto quando 0, enquanto carrega e em erro (o atalho continua clicável). Região `aria-live="polite"`, números com `tabular-nums`. Atualiza ao montar e ao voltar o foco à janela, como as demais consultas da lista.
- D9 [Proposta] Visibilidade é só de interface: a API continua aceitando os mesmos filtros para qualquer perfil que já enxerga o ticket. A restrição por perfil define quem vê o atalho, não o que a API devolve.
- D10 [Proposta] Parecer de design (impeccable e web-design-guidelines; o launcher do impeccable falhou com "Permission denied", então o contexto foi lido direto: não há PRODUCT.md nem DESIGN.md, vale o DS e o ADR 0001): superfície Operate. Dois `<button type="button">` com `aria-pressed`, ícone do `lucide-react` com `aria-hidden`, texto como na captura ("Autorizações", "Tickets fechados"), contador no `EzBadge` com par de cor `red-*` do DS. Altura `--control-height-compact`, raio `rounded-control`, estado ativo com `brand-*`, foco visível por `focus-visible`, `flex-wrap` com `min-w-0` para celular. Só paleta e escala do DS (`check_tickets_palette.py`, `check_tickets_proportion.py`). É botão e não link porque o clique só muda o filtro da própria tela, que já sincroniza a URL com `replace`.
- D11 [Proposta] Um componente novo da aba, `TicketShortcuts`, em `components/tickets` (não é componente do DS); `TicketsPage` o renderiza só no modo Lista, entre o cabeçalho e os filtros ativos. Reutiliza `EzBadge`, sem componente DS novo, então sem story obrigatória (`design_system.reused: EzBadge`).
- D12 [Proposta] Termos novos no `GLOSSARY.md`: **Atalho da lista** e **Autorização**. Sem ADR: a decisão é reversível e sem trade-off arquitetural.
- D13 [Proposta] Sem feature flag: a mudança é só de interface sobre filtros existentes e não tem efeito externo.
- D14 [Proposta] Kanban: não muda. Se um filtro de atalho vier na URL e o usuário abrir o Kanban, vale o comportamento de hoje desses filtros; não é tratado aqui.

Riscos:

- R1: `closedOnly` é ignorado pela API quando há `status`, `notClosed`, `unassigned` ou `paused`, e `paused` também sobrepõe `status`; por isso D6 limpa esses filtros ao ligar um atalho. Coberto por AC-02 e AC-03.
- R2: perfis. CLIENT_MASTER não é CLIENT, então tem Lista e Kanban e, pelo D3, o atalho Autorizações; CLIENT vê só Fechados. Coberto por AC-01.
- R3: a contagem é uma consulta a mais por abertura da lista para três perfis; custo de uma linha de total, com `limit=1`.
- R4: nenhum teste de contrato de API muda; qualquer alteração em `apps/api` nesta entrega indica desvio do escopo.

## Acceptance criteria

- AC-01: no modo Lista, "Tickets fechados" aparece para ADMIN, AGENT_MASTER, AGENT, CLIENT_MASTER e CLIENT; "Autorizações" aparece só para ADMIN, AGENT_MASTER e CLIENT_MASTER.
- AC-02: clicar em "Tickets fechados" pede `GET /tickets` com `closedOnly=true` e sem `status`, grava `closedOnly=true` na URL, marca o botão com `aria-pressed="true"` e mostra "Fechados" nos filtros ativos; clicar de novo desliga o filtro e volta `aria-pressed` para `false`.
- AC-03: clicar em "Autorizações" pede `GET /tickets` com `status=PENDING_APPROVAL` e sem `closedOnly`, grava `status=PENDING_APPROVAL` na URL, marca o botão com `aria-pressed="true"` e mostra "Status: Aguardando Aprovação" nos filtros ativos; com um atalho ligado, clicar no outro desliga o primeiro e liga o segundo.
- AC-04: ligar um atalho mantém Buscar e os demais filtros ativos e volta a página para 1.
- AC-05: o contador de "Autorizações" mostra o `meta.total` de `GET /tickets?status=PENDING_APPROVAL&limit=1`, independente dos filtros ativos; fica oculto quando o total é 0, enquanto carrega e em erro; perfis que não veem o atalho não fazem essa consulta.
- AC-06: os atalhos não aparecem no Kanban nem fora do modo Lista; abrir `/?view=list&closedOnly=true` ou `/?view=list&status=PENDING_APPROVAL` já mostra o atalho correspondente ligado.
- AC-07: os atalhos são `<button>` com `aria-pressed`, ícone com `aria-hidden` e foco visível; o contador tem `aria-live="polite"` e `tabular-nums`; só cores e escala do DS (`check_tickets_palette.py` e `check_tickets_proportion.py` passam); a fileira quebra de linha em 390px sem rolagem horizontal (aceite visual do Alfredo).
- AC-08: nenhum arquivo de `apps/api` muda e não há migração.

## Testing Decisions

Um bom teste confere o que o usuário vê e faz (botões, estado, filtros ativos, URL) e o que a tela pede à API, não detalhe de implementação. Seam único, o mais alto: `TicketsPage.test.tsx` (Vitest + Testing Library, `api.get` mockado, `LocationProbe` para a URL), que já cobre filtros e `?view=`. Prior art: os casos de `?mine=true`, `?closedOnly=true` e `?view=` nesse arquivo. O componente `TicketShortcuts` é exercitado só por essa tela; um teste próprio só se a tela não alcançar um caso.

| AC | Verificação |
|---|---|
| AC-01 | `TicketsPage.test.tsx`, um caso por perfil (ADMIN, AGENT_MASTER, AGENT, CLIENT_MASTER, CLIENT) |
| AC-02, AC-03 | `TicketsPage.test.tsx`, cliques, parâmetros do `GET /tickets`, URL e `aria-pressed` |
| AC-04 | `TicketsPage.test.tsx`, busca mais atalho, com página 2 antes do clique |
| AC-05 | `TicketsPage.test.tsx`, total 3, 0, carregando e erro; ausência da chamada para AGENT |
| AC-06 | `TicketsPage.test.tsx`, modo Kanban e entradas de URL |
| AC-07 | `TicketsPage.test.tsx` (papéis e atributos) e `check_tickets_palette.py`/`check_tickets_proportion.py`; foco e 390px com captura de tela para o aceite visual |
| AC-08 | `git diff --stat` do PR sem `apps/api` e sem `prisma/migrations` |

A aparência final tem aceite visual do Alfredo, que teste e captura não substituem.

## Out of Scope

- **Pré-tickets** e **Tickets em revisão**: pendentes, sem regra de negócio definida no Aponta (não existe entidade nem estado de pré-ticket, nem estado de revisão no ticket). O Alfredo descreve a regra de cada um depois, em cards próprios. As permissões `ACCESS_PRE_TICKETS`, `OPEN_REQUESTS_AS_PRE_TICKETS` e `REVIEW_REOPEN_CLOSED_TICKETS` e a configuração de revisão da mesa seguem como estão.
- Kanban, Busca avançada e dashboard.
- API, schema, migração e permissões novas.
- Agrupar os atalhos por mesa ou salvar atalhos personalizados.

## Further Notes

- A captura de referência é da tela do TiFlux. Do TiFlux copiam-se estrutura e proporção, não a paleta (ADR 0001).
- Mudança de escopo atualiza esta SPEC antes de implementar.
