# Catálogo de serviços: filtro por Cliente e mesa, "não catalogado" no topo e cartões de categoria

Identidade: DMTE-485, issue dmrepositorio/aponta#204, Tier 2, ciclo 2026-11-09/2026-11-22. Funcionalidade nova no catálogo da abertura de chamados: grill-with-docs → to-spec → to-tickets (AGENTS.md). Origem: pedido de revisão do responsável e decisões dele registradas no pai Multica DMTE-485 (rodadas Q1 a Q11). Esta SPEC é a única autoridade; `docs/delivery/specs/DMTE-485.md` e o corpo da issue têm o mesmo conteúdo.

## Problem Statement

Na tela de novo chamado (`/tickets/new`), o catálogo de serviços que abre o fluxo não considera para quem o chamado é aberto. Observado no código (main 0dfe7b9):

- `GET /catalog` devolve todos os itens ativos a qualquer usuário logado. Não olha o Cliente, nem se a mesa de destino está ativa, recebe chamados ou é utilizável pelo papel do usuário.
- O Cliente escolhido no formulário não chega à API, e é assim que deve continuar: o Cliente do chamado é a organização do solicitante (decisão do responsável em 2026-11-12). Solicitante de outra empresa fica fora desta entrega.
- A relação Mesa ↔ Cliente já existe (N:N; mesa sem cliente vinculado é global) e já filtra mesas para usuários CLIENT, mas o catálogo não a usa.
- As categorias aparecem em faixas de largura total com grade de 3 colunas. A seed tem 18 itens em 8 categorias (1, 1, 2, 2, 2, 3, 3 e 4 itens), então categorias de 1 item deixam a faixa quase vazia. O filtro por Cliente vai encolher as categorias ainda mais.
- O botão "Meu problema não está catalogado" fica no fim da página. Em mesa com "Catálogo obrigatório ao abrir", o chamado em branco é recusado: o formulário não envia e não mostra erro, e o backend responderia 400.

## Solution

O catálogo passa a mostrar só o que a pessoa pode usar, para o Cliente em questão. O usuário CLIENT vê o catálogo da própria empresa. O atendente escolhe o Cliente no topo da página e a lista se reduz aos itens cuja mesa serve aquele Cliente. As categorias viram cartões que preenchem a largura em 2 ou 3 colunas, sem faixas vazias. "Meu problema não está catalogado" sobe para o cabeçalho e abre chamado em qualquer mesa, inclusive nas que pedem catálogo.

## User Stories

1. Como usuário CLIENT, quero ver no catálogo só os serviços da minha empresa e das mesas globais, para não escolher serviço que não me atende.
2. Como usuário CLIENT_MASTER, quero o mesmo recorte do CLIENT, para o catálogo respeitar o isolamento entre empresas.
3. Como atendente, quero escolher o Cliente no topo do catálogo, para ver os serviços que valem para ele.
4. Como atendente, quero começar sem Cliente e ver todos os itens que posso usar, para abrir chamado interno ou ainda não vinculado a cliente.
5. Como atendente, quero que o Cliente escolhido vá para o formulário já preenchido e travado, para não ter de escolher de novo nem trocá-lo por engano.
6. Como atendente, quero que a lista de mesas do formulário só traga mesas que atendem o Cliente escolhido, para não escolher mesa que não o atende.
7. Como usuário, quero que itens de mesa inativa, sem receber chamados ou fora do meu acesso não apareçam, para não ver serviço que vai falhar ao enviar.
8. Como usuário, quero ver mensagem quando o filtro não deixa nenhum item, e ainda poder abrir chamado em branco, para não ficar numa tela vazia.
9. Como usuário, quero o botão "Meu problema não está catalogado" no cabeçalho da página, para achá-lo sem rolar até o fim.
10. Como usuário, quero abrir chamado em branco mesmo em mesa que pede o catálogo, para não travar um atendimento por falta de item adequado.
11. Como administrador de mesa, quero o rótulo da opção de catálogo claro sobre o que ela faz, para não esperar um bloqueio que não existe.
12. Como usuário, quero as categorias em cartões que ocupam a largura, para ler o catálogo sem faixas vazias.
13. Como usuário de teclado ou leitor de tela, quero que cada categoria seja uma região com título e que cada serviço seja um botão com foco visível, para operar o catálogo sem mouse.
14. Como usuário de celular, quero o catálogo em uma coluna sem rolagem horizontal, para usá-lo na tela pequena.
15. Como integrador de API, quero que o chamado sem item numa mesa com catálogo exigido continue recusado se eu não declarar `semCatalogo`, para a regra da mesa seguir valendo para quem pula a tela.

## Implementation Decisions

Vocabulário (ver GLOSSARY.md): **Catálogo de serviços** é o da abertura de chamados (itens ligados a uma mesa); **Catálogo de conhecimento** é outro recurso e fica fora.

Disponibilidade e Cliente (fatias T1 e T2):

- `GET /catalog` passa a ser calculado para o usuário autenticado. Um item entra na resposta quando o item e a categoria estão ativos e a mesa de destino é utilizável por aquele usuário: reusa a regra de mesas visíveis por papel que já existe para listar mesas, mais as condições de abertura da mesa (ativa, aceitando chamados; para CLIENT e CLIENT_MASTER, sem uso interno e sem "só atendentes"; para atendente, a regra de mesa listada). Categoria que fica sem itens some da resposta.
- `GET /catalog` aceita `organizationId` opcional (UUID). Para ADMIN, AGENT e AGENT_MASTER, restringe aos itens cuja mesa tem esse Cliente vinculado ou não tem nenhum Cliente vinculado. Sem o parâmetro, não restringe por Cliente. Para CLIENT e CLIENT_MASTER o parâmetro é ignorado: vale sempre a organização do usuário.
- `POST /tickets` não aceita `organizationId`: o Cliente comercial do chamado continua sendo a organização do solicitante, que é o usuário logado. O Cliente escolhido na tela só filtra o catálogo e as mesas; abrir chamado em nome de usuário de outra empresa depende de Solicitante, fora desta entrega.
- Sem migração de banco: nenhuma coluna ou tabela nova.

Tela (fatias T2, T3 e T4):

- Seletor de Cliente no topo do catálogo, acima das categorias, só para atendente. Ao escolher, refaz a consulta com `organizationId`. O Cliente segue para o formulário pré-preenchido e travado quando veio do catálogo. No fluxo em branco, a lista de mesas do formulário também só mostra mesas que servem o Cliente escolhido (só na tela; a API não recebe o Cliente).
- Quando o filtro não deixa itens, a tela mostra estado vazio e mantém o botão de chamado em branco.
- O botão "Meu problema não está catalogado" vai para o cabeçalho, ao lado do título, com o mesmo texto e o mesmo comportamento.
- `semCatalogo`: campo booleano opcional na criação. Com `semCatalogo: true` e sem `catalogItemId`, mesa com `catalogRequiredOnOpen` aceita o chamado. Sem o campo e sem item, continua 400 "O item do catálogo é obrigatório nesta mesa.". `semCatalogo: true` junto de `catalogItemId` é 400. O campo não é gravado. O fluxo em branco da tela envia `semCatalogo: true`; o aviso amarelo e o bloqueio de envio por `catalogRequiredOnOpen` saem do formulário.
- Rótulo da opção em Mesas: de "Catálogo obrigatório ao abrir" para "Mostrar o catálogo ao abrir (permite 'não catalogado')". O nome interno `catalogRequiredOnOpen` não muda. A opção continua recusando, na API, chamado sem item que não declare `semCatalogo`.
- Layout: cada categoria vira um cartão com o nome no topo e os serviços empilhados (ícone, título, descrição curta), distribuídos em fluxo de colunas: 1 coluna abaixo de 640 px, 2 a partir de 640 px, 3 a partir de 1024 px; o cartão não se parte entre colunas. Categoria sem itens não renderiza. A ordem de categorias e itens segue alfabética, como hoje (sem `sortOrder`). O card do serviço não mostra a mesa de destino.
- Componentes: `EzCardItem`, `EzButton`, `EzAlert`, `EzSearch`/`EzComboBox` do DS do Aponta e tokens; nenhum componente de DS novo ou alterado (sem story nova), sem Carbon nem Next.js.

Dependência de sequência: a DMTE-483 (#200) corrige largura do formulário e o formulário que aparece antes do catálogo, no mesmo `CreateTicketPage`. Ela entra antes; esta entrega parte da `main` depois do merge dela.

### Parecer de design (UI)

Direção: manter a identidade e o DS existentes (modo Operate: tarefa de escolher serviço; clareza e consistência acima de expressão). `PRODUCT.md` e `DESIGN.md` não existem; o código é a autoridade visual e o `impeccable init` fica como sugestão futura, fora desta entrega. Impeccable: contexto carregado, sem detector antes de haver código novo; rodar o detector nos arquivos alterados no fim da implementação. Web Design Guidelines (regras obtidas da fonte em 2026-11-11), aplicadas à tela atual e ao desenho novo:

- cada item é `<button>` com foco visível (já é assim); manter, e exigir nome acessível com título e descrição.
- cada cartão é uma região com título (h2) ligada por `aria-labelledby`; os serviços formam uma lista.
- o seletor de Cliente precisa de `label` e `autocomplete` desligado; o resultado do filtro anuncia a mudança em região `aria-live="polite"`.
- títulos longos quebram (`break-words`) e a descrição limita linhas; cartão não pode estourar em 1 coluna.
- estado vazio obrigatório (filtro sem itens) e sem rolagem horizontal em celular.
- não usar `transition: all`; hover e foco com contraste maior que o repouso.
- estado do Cliente na URL: fora do escopo.

Aceite visual é decisão do responsável: a evidência técnica (testes, captura) não o substitui.

## Acceptance criteria

- AC-01: `GET /catalog` devolve só itens ativos, de categoria ativa, cuja mesa está ativa e recebendo chamados e é utilizável pelo papel do usuário: CLIENT e CLIENT_MASTER não recebem item de mesa de uso interno nem só de atendentes; atendente de mesa listada-apenas não recebe item de mesa onde não está listado quando `unlistedCanCreateTicket` é falso.
- AC-02: `GET /catalog` omite a categoria cujos itens ficaram todos fora da resposta.
- AC-03: `GET /catalog?organizationId=<id>` por ADMIN, AGENT ou AGENT_MASTER devolve só itens cuja mesa tem esse Cliente vinculado ou nenhum Cliente vinculado; sem o parâmetro, não filtra por Cliente.
- AC-04: para CLIENT e CLIENT_MASTER, `GET /catalog` ignora `organizationId` e usa a organização do usuário (nunca devolve item de mesa só de outra empresa).
- AC-07: na tela de novo chamado, o atendente vê o seletor de Cliente acima do catálogo e o usuário CLIENT não; ao escolher um Cliente, a tela consulta o catálogo com `organizationId` e mostra o resultado.
- AC-08: o Cliente escolhido no catálogo chega ao formulário preenchido e travado, e o envio não leva `organizationId`; no fluxo em branco, a lista de mesas só mostra mesas que servem o Cliente escolhido.
- AC-09: quando o filtro não deixa nenhum item, a tela mostra mensagem de catálogo vazio e mantém o botão de chamado em branco.
- AC-10: o botão "Meu problema não está catalogado" aparece no cabeçalho, ao lado do título "Catálogo de Serviços", e não mais depois das categorias; ao clicar, abre o formulário em branco.
- AC-11: `POST /tickets` com `semCatalogo: true` e sem `catalogItemId` é aceito em mesa com `catalogRequiredOnOpen`; sem `semCatalogo` e sem item continua 400; `semCatalogo: true` com `catalogItemId` dá 400; `semCatalogo` não é gravado no chamado.
- AC-12: o fluxo em branco envia `semCatalogo: true` e nenhum `catalogItemId`, o formulário não bloqueia o envio por `catalogRequiredOnOpen` e não mostra o aviso "Esta mesa exige um item do catálogo".
- AC-13: em Mesas, a opção `catalogRequiredOnOpen` aparece com o rótulo "Mostrar o catálogo ao abrir (permite 'não catalogado')".
- AC-14: o catálogo renderiza um cartão por categoria com itens, com o nome da categoria como título e os serviços dentro; categoria sem itens não renderiza; o card do serviço não mostra a mesa; categorias e itens seguem em ordem alfabética.
- AC-15: o contêiner dos cartões usa 1 coluna abaixo de 640 px, 2 a partir de 640 px e 3 a partir de 1024 px, e o cartão não se parte entre colunas; cada serviço é um botão com nome acessível e cada cartão uma região rotulada pelo título.

## Testing Decisions

Um bom teste só observa comportamento externo: resposta de `GET /catalog`, resultado ou erro de `POST /tickets`, o que a tela renderiza e o payload que ela envia. Nada de testar detalhe de implementação.

Seams, os mais altos que já existem:

1. API, catálogo: `CatalogController`/`CatalogService` (`GET /catalog` com usuário e `organizationId`), no padrão de `catalog.controller.spec.ts` e `catalog.service.spec.ts` com Prisma simulado. AC-01 a AC-04.
2. API, criação: `TicketsService.create` e `assertDeskAllowsOpen`, no padrão de `tickets.service.spec.ts` e `desk-policy.spec.ts`. AC-11 e a prova de que o Cliente comercial segue o solicitante.
3. Web: `CreateTicketPage` renderizada com `api` simulado, no padrão de `CreateTicketPage.test.tsx` (consulta enviada, DOM, payload de `POST /tickets`); `TicketForm.test.tsx` para o aviso; `MesaFlagEditor.test.tsx` para o rótulo. AC-07 a AC-10, AC-12 a AC-15.

Cobertura de tenant: AC-01 e AC-04 são a prova de isolamento (CLIENT nunca vê item de mesa de outra empresa); o QA reproduz com usuários de duas organizações. Comandos: `npx jest <spec>` em `apps/api` e `npx vitest run <arquivo>` em `apps/web`. O layout em 640/1024 px é verificado por teste de classes e por captura em desktop e celular, que o responsável aceita visualmente. Testes planejados não são testes executados.

## Out of Scope

- Solicitante no formulário e no payload.
- Tela de administração do catálogo e ordenação manual (`sortOrder`).
- Persistir que o chamado foi aberto como "não catalogado".
- Alterar a seed do catálogo ou o catálogo de conhecimento.
- Mostrar a mesa de destino no card.
- Estado de carregamento da página e largura do formulário (DMTE-483, #200).
- Cliente na URL; `PRODUCT.md`/`DESIGN.md`.

## Riscos

- A mesa sem Cliente vinculado é global: item de mesa global aparece para qualquer Cliente. É o comportamento já adotado para listar mesas.
- A regra "mesa efetiva serve o Cliente" também vale na criação em branco. Chamado de atendente numa mesa de outro cliente, que hoje passa, passa a dar 400. É a intenção, mas muda o comportamento: o responsável confirma na aprovação da divisão em tickets.
- `catalogRequiredOnOpen` deixa de bloquear a tela e passa a exigir só a declaração `semCatalogo` na API. Integrações que criam chamado sem item nessas mesas continuam recusadas.
- Retirado em 2026-11-12: gravar o Cliente escolhido em `commercialOrganizationId` quebraria a igualdade entre esse campo e a organização do solicitante, e todo consumidor (visibilidade do `CLIENT_MASTER`, faturamento, dashboard, agenda, lista) lê o solicitante como Cliente do chamado. AC-05, AC-06 e AC-16 deixaram de existir; a numeração dos demais ACs não muda.
- `semCatalogo` entra no DTO de criação, que rejeita campos desconhecidos (`organizationId` continua rejeitado): o web e a API mudam juntos.
- Verificar, na fatia T2, se a criação já valida acesso à mesa pelo mesmo recorte de `GET /service-desks`; se não valida, o teste de tenant registra a lacuna e a SPEC volta ao alinhamento em vez de a fatia absorver o conserto.

## Matriz de validação

| AC | Seam | Evidência esperada |
|---|---|---|
| AC-01, AC-02 | catálogo (API) | spec do serviço/controlador, RED/GREEN |
| AC-03, AC-04 | catálogo (API) | spec com usuário de duas organizações |
| AC-07, AC-08, AC-09, AC-10 | `CreateTicketPage` | teste de tela + payload |
| AC-11 | criação (API) | spec de `desk-policy`/`TicketsService.create` |
| AC-12 | `CreateTicketPage`/`TicketForm` | teste de tela + payload |
| AC-13 | Mesas | teste do editor de flags |
| AC-14, AC-15 | `CreateTicketPage` | teste de DOM; captura em desktop e celular para aceite visual |

## Further Notes

Fatias propostas e arestas de bloqueio estão no comentário de planejamento do pai DMTE-485 e viram sub-issues desta issue depois da aprovação. `ready-for-agent` é aplicado nesta issue e nas sub-issues só depois dessa aprovação.
