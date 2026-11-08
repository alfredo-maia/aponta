# DMTE-427: refinar estética e proporção da aba Tickets

Versão: v2 (decisões confirmadas e fatias em rascunho). Substitui a v1 (`f3de538`). Issue GitHub #120. Tier 3. Ciclo 01 (26/10–08/11/2026); a implementação pode passar de 08/11.
Pedido novo e independente: não usa DMTE-78, PR #91 nem a SPEC de 2026-10-23 como base.

Legenda de procedência: **[Código]** observado no checkout `999d1cc`; **[Humano]** decisão confirmada pelo Alfredo; **[Proposta]** recomendação do Architect, ainda sem confirmação.

### Decisões confirmadas na rodada de alinhamento (v2)

O Alfredo respondeu "Vamos lá, aprovado" à SPEC v1 (comentário `01a1a36e-d331-7855-8a45-b698c5bc60ec`). O coordenador leu isso como aceite das recomendações Q1 a Q7 e da divisão em sete fatias (comentário `01a1a36f-2048-7ee7-b5a8-3fc38dffa4ba`), com abertura para o Alfredo corrigir. O "aprovado" não repetiu cada item; a leitura por item é do coordenador. Abaixo, toda decisão marcada [Proposta] na v1 que cai numa dessas respostas passa a [Humano], com esta fonte.

- Q1: o Alfredo não enviou print do Aponta. O benchmark usa só os prints do TiFlux. **Limitação registrada:** o estado atual do Aponta vem da leitura do código, sem renderização nem comparação ponto a ponto; os achados do "Estado atual" são hipóteses até a primeira captura do Developer (fatia 1).
- Q2: só visual; abas de estado do TiFlux e play no cartão fora.
- Q3: identidade verde do Aponta mantida; sidebar e barra de abas internas fora.
- Q4: paleta única `brand-*`. ADR `docs/adr/0001-paleta-unica-brand-na-aba-tickets.md`.
- Q5: 1440, 1280, 1024 e 768px; abaixo de 768px fora. **Revisada pelo Alfredo em 2026-11-08 (comentário "já vamos para a fatia 7 ... deixar o sistema funcionando em pc e celulares", no fio da DMTE-430): celular entra no escopo, medido em 390px. O shell global (menu lateral) também entra, porque a barra fixa de 240px ocupava quase toda a tela do celular (revisa D3 e D12).**
- Q6: aceite visual do Alfredo por capturas comparadas ao TiFlux, sem diff automático.
- Q7: testes pela `TicketsPage` com dados simulados, mais stories e testes do DS, mais o aceite visual.
- Fatias: as sete abaixo, sem juntar 5 e 6.

As demais decisões D/I (valores de escala D6, forma do chip D8, detalhes de I1–I5) seguem [Proposta] dentro desse aceite geral e são fechadas pelo Developer na fatia 1 com medidas reais, sem exigir nova decisão do Alfredo, salvo conflito.

## Problem Statement

Alfredo, que usa o TiFlux como referência, vê a aba Tickets do Aponta diferente do TiFlux "em alguns pontos", sem elegância estética e com desproporção no layout. O pedido original dizia também que o layout não está responsivo e que as cores estão ruins. O escopo é toda a aba Tickets [Humano].

Limitação do benchmark: só há dois prints, e são do TiFlux (Lista e Kanban). Não existe print do Aponta ao lado. O estado atual do Aponta abaixo vem da leitura do código, não de renderização. Cada ponto precisa ser confirmado visualmente (Q1: o Alfredo não enviou print do Aponta).

### Estado atual do Aponta [Código]

1. Mistura de paletas. O DS define `gray-70…1000` próprio (ex.: `gray-100` = #dedede, `gray-500` = #494a4e). Tailwind ainda fornece a escala padrão para os degraus que o DS não define. `bg-gray-50` (cabeçalho e hover da Lista, bloco do detalhe) vem da escala padrão do Tailwind, enquanto `border-gray-100` vem do DS e é bem mais escuro do que o nome sugere. O detalhe usa também `teal-50`, `emerald-50`, `rose-50`.
2. Verde de marca duplicado. O DS usa `brand-600` = #008561. `TicketDetailPage` e `TicketWorklogs` usam `#00B5A5` e `#009E90` direto em 8 pontos. Dois verdes diferentes na mesma aba.
3. SLA do card do Kanban é verboso. `SlaBadge` renderiza pílulas largas do tipo "Resposta: Dentro do prazo" em verde-100/amarelo-100/vermelho-100, empilhadas. O TiFlux usa chips curtos com ícone e tempo restante (ex.: "-3d", "17h18").
4. Alturas e raios inconsistentes. Controles de 34px e 38px lado a lado; raios de 6, 8 e 10px; cantos `rounded-lg` e `rounded-[8px]` misturados.
5. Cabeçalho. Título 20px, alternância Lista/Kanban, busca e Busca avançada numa linha. A toolbar do Kanban (Mesa, filtro por responsável, Ordenar, Configurações) fica numa segunda linha, e a da Lista (Agrupar por, Exibir colunas) numa terceira, com `<select>` nativo e dropdown improvisado. Não há uma barra única como no TiFlux.
6. Coluna do Kanban com largura fixa `w-80` (320px) e `p-4`, cartão com `p-3`. As colunas ficam mais largas que as do TiFlux (~290px) e o cartão gasta área com linha de cliente, tag e avatar em linhas separadas.
7. Lista agrupada. Grupos começam recolhidos, sem ícone de expandir/recolher (só texto), diferente do TiFlux (ícone +).
8. Detalhe do ticket: cabeçalho, abas e blocos com estilos próprios. Busca avançada: formulário `max-w-3xl` estreito.
9. CLIENT não tem Kanban; a Lista é a única visão.

### Alvo visual (TiFlux) [Humano: prints]

- Lista: barra de abas de estado, botão primário "Filtros", linha de resumo com o filtro ativo ("Todos abertos") e "Redefinir filtro", "Agrupar por" e "Exibir colunas" à direita, linhas finas com ícone de expandir, muito espaço branco.
- Kanban: título + segmentado Lista/Kanban + Busca avançada na primeira linha; segunda linha com seletor de Mesa em destaque, Filtrar, fila de avatares, Buscar, Ordenar e ícone de configuração; colunas de ~290px, cabeçalho com nome + contador, cartão com número em destaque, título em até 2 linhas, tag neutra de status, chips de SLA compactos e avatar à direita.

## Solution

A aba Tickets inteira (cabeçalho e barra de ferramentas, Kanban, Lista, Busca avançada, Criar ticket, Detalhe) ganha uma linguagem visual única, proporcional e responsiva, mantendo a identidade verde Aponta [Proposta] e as funções que já existem. Para isso, o DS é evoluído: paleta unificada e tokens de proporção, mais poucos componentes novos ou ajustados. O resultado é validado por Alfredo com capturas comparadas ao TiFlux.

## User Stories

1. Como agente, quero ver o Kanban com colunas e cartões proporcionais, para ler número, título e prazo de relance.
2. Como agente, quero chips de SLA curtos (ícone + tempo restante) com cor semântica, para identificar vencidos sem ler texto longo.
3. Como agente, quero uma barra de ferramentas única e alinhada (Mesa, filtros, responsáveis, busca, ordenar, configurar), para trocar de contexto sem procurar controles em linhas diferentes.
4. Como agente, quero alternar Lista/Kanban num controle segmentado claro, para saber em qual visão estou.
5. Como agente, quero grupos da Lista com indicador de expandir/recolher, para entender que posso abrir cada cliente.
6. Como agente, quero a Lista com linhas de altura e tipografia consistentes, para varrer muitos tickets.
7. Como agente, quero que filtros ativos fiquem visíveis e possam ser redefinidos num clique, para não esquecer um filtro aplicado.
8. Como usuário CLIENT, quero a Lista com o mesmo acabamento da visão de agentes, para ter a mesma qualidade visual.
9. Como agente, quero o detalhe do ticket com cabeçalho, abas e blocos coerentes com o resto do sistema, sem um segundo verde.
10. Como agente, quero a Busca avançada e a criação de ticket com a mesma grade, alturas de campo e botões da lista, para não sentir telas de produtos diferentes.
11. Como agente num notebook de 1280px ou tablet de 768px, quero a aba utilizável sem sobreposição nem corte, para trabalhar fora do monitor grande.
12. Como agente, quero estados de carregamento, vazio e erro com o mesmo estilo, para a aba parecer acabada em qualquer situação.
13. Como mantenedor do DS, quero tokens e componentes documentados em stories, para reaproveitar o novo visual em outras telas.
14. Como Alfredo, quero comparar capturas do Aponta com o TiFlux por ponto, para aceitar ou pedir ajuste com base em evidência.

## Implementation Decisions

Escopo e exclusões

- D1 [Humano] Todas as opções da aba Tickets estão no escopo. [Proposta] Superfícies: (a) cabeçalho e toolbar; (b) Kanban (colunas, cartão, SLA, menu do cartão, estados); (c) Lista (tabela, agrupamento, colunas, paginação, estados); (d) Busca avançada; (e) Criar ticket; (f) Detalhe do ticket e seus blocos (comentários, apontamentos, anexos, checklist); (g) visão CLIENT.
- D2 [Proposta] Mudança só visual e de layout. Sem nova função, endpoint, dado ou permissão. As abas de estado do TiFlux (Pré-tickets, Autorizações, Tickets em revisão, Tickets fechados) são funcionalidade nova e ficam fora; só entram se Alfredo pedir (Q2).
- D3 [Proposta] Sidebar, barra de abas internas e shell global (`AppLayout`) ficam fora; só se ajustam se a proporção da aba exigir, com decisão registrada.

Direção visual

- D4 [Proposta] Manter a identidade Aponta (Ocean Green `brand-*`, Roboto). Do TiFlux se copiam estrutura, densidade e proporção, não a sidebar escura nem o verde-água. Confirmar em Q3.
- D5 [Proposta] Uma só paleta: eliminar os hex fixos (#00B5A5, #009E90) e as classes de paletas fora do DS (`teal-*`, `emerald-*`, `rose-*`, graus de `gray` não definidos pelo DS) na aba Tickets, trocando por tokens do DS.
- D6 [Proposta] Escala de proporção única: uma altura padrão de controle (36px, com 32px para densidade compacta), dois raios (8px controles e cartões; 9999px chips), uma sombra de cartão e uma de popover, espaçamento em múltiplos de 4. Os valores exatos são fixados na primeira fatia, a partir das medidas dos prints e da renderização real.
- D7 [Proposta] Kanban: coluna com largura-alvo ~290px e fundo sutil, cartão com número em destaque na cor de marca, título em até 2 linhas, tag de status neutra, chips de SLA compactos e avatar alinhado à direita na mesma linha dos chips. Cartão sem faixa vazia quando não há responsável.
- D8 [Proposta] SLA: chip curto com ícone (resposta / resolução) + tempo restante (negativo = vencido), cor semântica (verde/amarelo/vermelho do DS) com contraste mínimo AA, e tooltip com o texto completo ("Resposta: dentro do prazo, vence em …"). O texto longo sai do cartão. Dados (`responseSlaStatus`/`resolveSlaStatus`) permanecem; se faltar o tempo restante na API, o chip mostra só o ícone e o estado (decisão técnica da fatia, sem mudar o contrato sem aprovação).
- D9 [Proposta] Toolbar: uma barra única por visão, com altura de controle padrão. Kanban: Mesa, filtros, responsáveis, Buscar, Ordenar, Configurações. Lista: filtros ativos, Agrupar por, Exibir colunas. O alternador Lista/Kanban vira controle segmentado do DS.
- D10 [Proposta] Lista: cabeçalho de tabela e hover com tokens do DS, linhas de altura fixa, ícone de expandir/recolher nos grupos, contagem do grupo discreta, paginação com o botão do DS.
- D11 [Proposta] Detalhe, Busca avançada e Criar ticket reutilizam a grade, os campos e os botões do DS; sem estilos próprios de cor.
- D12 [Proposta, revisada por Q5] Responsividade: alvos 1440, 1280, 1024 e 768px e, por decisão do Alfredo, celular em 390px. Em telas menores que 768px o menu lateral vira um menu retrátil aberto por um botão no cabeçalho (AC-17). Kanban rola na horizontal; toolbar quebra em duas linhas sem sobrepor; Lista prioriza colunas Número, Título, Cliente, Status.

Impacto no DS [Proposta, o DS não é considerado fechado, conforme Alfredo]

- I1 Tokens: normalizar `@theme` em `styles.css` (superfície, borda sutil, texto secundário, estados de hover/seleção) e documentar a escala de altura/raio/sombra. Resolver o conflito entre a escala `gray-*` do DS e a escala padrão do Tailwind (definir os degraus que faltam ou proibir os que não existem).
- I2 Novo `EzSegmented` (controle segmentado) para Lista/Kanban. Antes de criar, verificar se `EzTabs` cobre o caso, conforme a regra de paridade de `docs/architecture/03-sankhya-ds-parity.md`; criar só se não houver equivalente funcional.
- I3 Novo chip de prazo (`EzSlaChip` ou variante de `EzTag`) com ícone + tempo. `SlaBadge` passa a delegar a ele.
- I4 Ajuste de `EzTag` (variantes mais suaves e tamanho compacto) e de `EzAvatar` (grupo/pilha com sobreposição) conforme necessário. Cada mudança considera o impacto em outras telas que usam o componente.
- I5 Toda mudança no diretório DS leva story e teste; `docs/architecture/03-sankhya-ds-parity.md` ganha a decisão. Storybook é construído no CI; o runner de interação/a11y ainda não está configurado, então a11y automática não é prometida.

## Testing Decisions

Seams [Proposta; confirmar em Q7]. Preferir os existentes e o mais alto possível:

1. Seam principal: `TicketsPage` renderizada com dados simulados (hook `useTickets` mockado), como já fazem `TicketsPage.test.tsx`, `TicketList.test.tsx` e `TicketKanbanCard.test.tsx`. Testa comportamento externo (o que aparece, o que é clicável, rótulos acessíveis), não classes CSS.
2. Seam do DS: stories + testes unitários dos componentes novos/alterados (padrão `Ez*.test.tsx` e `Ez*.stories.tsx`).
3. Seam humano: aceite visual por Alfredo com capturas antes/depois (ver AC-14). Não há baseline automática aprovada; comparação visual automática não é prometida.

Um bom teste verifica papéis, nomes acessíveis e presença/ausência de elementos, não detalhes de estilo. Garantias de estilo (sem hex fixo, sem paleta fora do DS) são verificadas por uma checagem estática (grep/lint) que roda no CI.

## Critérios de aceite

Cada critério abaixo é verificável de forma independente. Nada aqui foi executado; são planos.

- AC-01 Paleta única: nos arquivos da aba Tickets (páginas e componentes de tickets), nenhum hex literal de cor e nenhuma classe de paleta fora do DS (`teal-*`, `emerald-*`, `rose-*`, `gray-50` etc.). Verificação: checagem estática no CI (RED = achados atuais; GREEN = zero).
- AC-02 Tokens de proporção: altura de controle, raio e sombras seguem a escala definida em D6; não existem controles de 34px e 38px lado a lado numa mesma barra. Verificação: checagem estática dos valores e revisão das capturas.
- AC-03 Alternador Lista/Kanban usa o componente de DS (I2), com `aria-pressed` ou papel equivalente e foco visível. Teste na `TicketsPage`.
- AC-04 Toolbar do Kanban em uma única barra alinhada (Mesa, filtros, responsáveis, Buscar, Ordenar, Configurações). Teste de presença/ordem de controles + captura.
- AC-05 Cartão do Kanban: número, título (até 2 linhas, com `title`), tag de status, chips de SLA e avatar sem faixa vazia quando não há responsável. Teste em `TicketKanbanCard`.
- AC-06 Chips de SLA mostram ícone + tempo, cor semântica com contraste mínimo AA (texto sobre fundo) e texto completo em tooltip e no nome acessível. Teste unitário do chip + verificação de contraste dos pares de token usados.
- AC-07 Colunas do Kanban com largura-alvo ~290px, rolagem horizontal sem corte em 1280 e 1024px, cabeçalho com nome + contador. Captura por largura.
- AC-08 Menu do cartão e arrastar-e-soltar continuam funcionando como hoje. Os testes existentes do Kanban seguem verdes; nenhuma regressão de mover ticket entre estágios.
- AC-09 Lista: cabeçalho e linhas com tokens do DS, ícone de expandir/recolher nos grupos com `aria-expanded`, contagem do grupo, ordenação por coluna intacta. Testes em `TicketList`.
- AC-10 Lista: filtros ativos visíveis com ação de redefinir quando a tela já os suporta (sem criar filtro novo). Teste de comportamento.
- AC-11 Visão CLIENT: Lista com o mesmo acabamento e sem Kanban. Teste existente de papel CLIENT segue verde.
- AC-12 Detalhe, Busca avançada e Criar ticket: mesma grade, campos e botões do DS, sem estilos de cor próprios (cobre-se por AC-01) e sem mudança de comportamento. Testes existentes verdes.
- AC-13 Estados de carregamento, vazio e erro na Lista e no Kanban com o mesmo estilo e mensagens atuais. Testes de estado.
- AC-14 Evidência visual: o Developer anexa capturas (dados sintéticos) de Lista, Kanban, cartão, Detalhe, Busca avançada e Criar ticket em 1440, 1280, 1024, 768 e 390px; Alfredo aprova ponto a ponto contra os prints do TiFlux. Aceite visual é humano; capturas isoladas não bastam.
- AC-15 DS: cada componente de DS novo/alterado tem story e teste (≥3 casos), consta em `docs/architecture/03-sankhya-ds-parity.md` e o Storybook compila. Nenhuma tela existente que usa `EzTag`/`EzAvatar` quebra seus testes.
- AC-17 Celular (390px): sem rolagem horizontal da página; o menu lateral vira menu retrátil (botão "Abrir menu" no cabeçalho, painel com `role="dialog"`, fecha por Esc, toque fora ou ao navegar); acima de 768px o menu lateral continua fixo como hoje. Teste do menu retrátil mais captura de Lista, Kanban, Busca avançada, Criar ticket e Detalhe em 390px.
- AC-16 Sem mudança de contrato: nenhuma alteração de API, banco, permissão ou dado; testes de API não são tocados. Verificação: diff sem arquivos de `apps/api`.

Matriz AC → teste: AC-01/02 checagem estática; AC-03/05/09/10/11/13 Vitest em `TicketsPage`, `TicketList`, `TicketKanbanCard`; AC-04 teste da toolbar do Kanban; AC-06/15 testes e stories do DS; AC-07/14 capturas + aceite humano; AC-17 teste do menu retrátil + capturas em 390px; AC-08/12/16 suítes existentes + diff.

Evidência RED/GREEN (WORKFLOW) aplica-se a AC-01/02/03/05/06/09; ACs puramente visuais (AC-07, AC-14) registram "TDD não aplicável" com justificativa no manifesto, conforme o fluxo do repositório.

## Riscos

- R1 Mudar tokens/`EzTag`/`EzAvatar` afeta outras telas. Mitigação: cada mudança de DS lista consumidores e roda toda a suíte web; mudanças amplas ficam em fatia própria.
- R2 Subjetividade do "elegante". Mitigação: aceite humano ponto a ponto por capturas; sem print do Aponta, o diagnóstico vem do código e pode errar o alvo (Q1, sem print: limitação confirmada).
- R3 Prazo: Tier 3 com WIP 1 e fim do ciclo em 08/11. A implementação completa deve passar da data (Alfredo já aceitou). Priorizar as fatias por impacto (Kanban primeiro).
- R4 O tempo restante de SLA pode não vir da API. Se faltar, o chip fica só com ícone e estado, sem mudar contrato.
- R5 Sem baseline visual automática e sem runner a11y configurado: não declarar a11y ou regressão visual aprovadas por ferramenta.
- R6 `TicketKanban.tsx` (969 linhas) e `TicketWorklogs.tsx` (1723) são grandes; reestilizar sem mudar comportamento exige diffs pequenos.
- Segurança/tenant: sem mudança de autorização, API ou dados; nenhum novo risco de isolamento. Dados de teste e capturas sintéticos.

## Out of Scope

Funcionalidades novas do TiFlux (abas de estado de tickets, Autorizações, play/apontamento no cartão, chats), mudanças de API/banco/permissão, shell global, SPEC e entrega DMTE-78, tema escuro, otimização abaixo de 768px (salvo decisão em Q5).

## Further Notes

- Fontes: fechamento da Triagem (`01a1a365-2ff5-740a-9ebf-c7b7d2fb80ce`), issue #120, `.delivery/registry.json` (commit `999d1cc`), prints TiFlux `01a1a301-fb2c-71a3-82de-4cdfe94d8972` (Lista) e `01a1a302-3b96-7196-a97d-11b213c3a8a5` (Kanban). O benchmark no TiFlux é só leitura.
- Glossário/ADR: o repositório não tem `GLOSSARY.md` nem `docs/adr/`. Nenhum termo novo foi resolvido com o humano ainda; nada foi criado. A decisão de DS (I1–I5) pode virar ADR se Alfredo confirmar a unificação de paleta (difícil de reverter, surpreendente sem contexto, com alternativas reais).
- Decomposição: ver "Fatias (rascunho)". Não foram criadas issues; o coordenador as cria no Multica depois de revisar esta SPEC.

## Fatias (rascunho)

Execução em série (WIP 1). Fatias técnicas são filhas Multica do DMTE-427, sem issue GitHub nova (AGENTS.md). Cada fatia é verificável sozinha e cabe numa janela de contexto. Status de cada ticket ao publicar: `ready-for-agent`, conforme o `to-tickets` original. Identificadores reais só existem depois que o coordenador criar as filhas; até lá as dependências usam o número da fatia.

| # | Fatia | Bloqueada por | Entrega | ACs |
|---|---|---|---|---|
| 1 | Fundação visual | nenhuma | `@theme` normalizado (paleta única, escala de altura, raio e sombra), checagem estática no CI (hex e paletas fora do DS na aba), stories base, atualização do doc de paridade DS, primeira captura do estado atual do Aponta | AC-01, AC-02, AC-15 (parcial), AC-16 |
| 2 | Kanban | 1 | Toolbar única, colunas ~290px, cartão, chip de SLA com ícone e tempo (novo componente de DS), menu do cartão, estados | AC-04, AC-05, AC-06, AC-07, AC-08, AC-13 (Kanban), AC-15 (chip) |
| 3 | Cabeçalho e alternador | 1 | Cabeçalho com controle segmentado Lista/Kanban (novo componente ou `EzTabs`, após verificar), busca e Busca avançada alinhadas | AC-03, AC-15 (segmentado) |
| 4 | Lista e visão CLIENT | 1, 3 | Tabela, agrupamento com ícone e `aria-expanded`, filtros ativos e redefinir (se já suportados), paginação, visão CLIENT | AC-09, AC-10, AC-11, AC-13 (Lista) |
| 5 | Busca avançada e Criar ticket | 1 | Telas com grade, campos e botões do DS | AC-12 (parte) |
| 6 | Detalhe do ticket | 1 | Cabeçalho, abas e blocos (comentários, apontamentos, anexos, checklist) sem cores próprias | AC-12 (parte) |
| 7 | Responsividade e aceite visual | 2, 3, 4, 5, 6 | Ajustes finais em 1440/1280/1024/768px, estados e capturas de todas as superfícies para o aceite do Alfredo | AC-07 (todas as larguras), AC-14 |

Ordem sugerida: 1, 2, 3, 4, 5, 6, 7 (Kanban primeiro depois da fundação por ser a tela do print de referência). 5 e 6 não têm dependência entre si e permanecem separadas. A fatia 3 precede a 4 porque a Lista usa o alternador e a barra do cabeçalho. Por WIP 1 nada roda em paralelo, mesmo onde o grafo permitiria.

Para cada fatia o Developer: fixa a base SHA, captura RED e GREEN dos ACs com teste, mantém o manifesto `.delivery/deliveries/DMTE-427.json`, e abre PR curta com `Aponta-Delivery: DMTE-427` e `Refs alfredo-maia/aponta#120`. QA independente reproduz os checks no SHA. O aceite visual (AC-14) é humano e fecha na fatia 7.

Riscos de ordem: a fatia 1 muda tokens e pode afetar outras telas (R1); por isso ela roda a suíte web inteira. Se o ciclo 01 apertar, 1 e 2 entregam o maior ganho visual.
