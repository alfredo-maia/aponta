# Paridade Sankhya DS (`ez-*`) → Aponta DS

Documento de decisão arquitetural. O Aponta DS mira **paridade funcional** com o
catálogo Sankhya DS (`ez-*`, documentado em
`gilded-nasturtium-6b64dd.netlify.app`), mas **sem replicar APIs imperativas ou
composições legadas que não são idiomáticas em React**.

Regra geral: antes de implementar um componente novo, verificar se o nome
`ez-*` já não é atendido por um equivalente Aponta — duplicar componentes com
API diferente para "paridade de nome" gera custo de manutenção sem ganho real.

## Equivalências oficiais (não criar componente novo)

| Sankhya DS | Aponta DS | Justificativa |
|---|---|---|
| `ez-tabselector` | `EzTabs` | Mesma função (seleção de aba ativa). `EzTabs` usa API controlada React (`value`/`onChange`), enquanto `ez-tabselector` é imperativa (`setActive()`). Idiomático React > paridade literal de API. |
| `ez-multi-select-input` | `EzMultiSelect` | Mesma função (seleção múltipla com tags). Sankhya implementa como composição de `ez-popover` + `ez-list`; `EzMultiSelect` encapsula tudo num único componente controlado — padrão React mais limpo. |
| `ez-grid` (engine completa) | `EzGridWrapper` + Tanstack React Table | `ez-grid` da Sankhya é uma engine completa (paginação server-side, edição inline, `DataUnit`, totalizadores, filtro de coluna). Decisão deliberada e documentada no próprio código: usar Tanstack React Table como engine e `EzGridWrapper` como skin DS. Reimplementar a engine Sankhya seria reinventar uma lib madura. |
| `ez-sidebar-button` | `EzSidebarButton` (em `EzSidebar.tsx`) | Já existia embutido no `EzSidebar` — não criar arquivo standalone. |
| `ez-empty-card` | `EzEmptyCard` (em `EzCardItem.tsx`) | Versão conectada às páginas reais (`OrganizationsPage` etc.) vive em `EzCardItem.tsx`. Existe uma implementação standalone em `EzEmptyCard.tsx` (com testes próprios) **não exportada pelo barrel** — consolidar é refactor futuro. |
| `ez-file-item` | `EzFileItem` (em `EzUpload.tsx`) | Idem: versão em uso (TicketForm) vive em `EzUpload.tsx`; standalone em `EzFileItem.tsx` não é re-exportada. |
| `ez-list-item` | `EzListItem` (em `EzList.tsx`) | Idem: versão em uso (`EzDoubleList`) vive em `EzList.tsx`; standalone em `EzListItem.tsx` não é re-exportada. |

## Componentes criados para paridade (barrel `index.ts`)

Os seguintes componentes foram criados porque eram gaps reais (não tinham
equivalente funcional no Aponta DS) — todos com testes e tokens DS:

`EzActionsButton`, `EzAlertList`, `EzCalendar`, `EzChart`, `EzChip`,
`EzClassicComboBox`, `EzClassicInput`, `EzClassicTextArea`, `EzCollapsibleBox`,
`EzDateTimeInput`, `EzDialog`, `EzFilter`, `EzFilterInput`, `EzForm`,
`EzFormView`, `EzGridView`, `EzGuideNavigator`, `EzModalContainer`,
`EzMultiSelectionList`, `EzNumberInput`, `EzPopoverPlus`, `EzPopup`, `EzScrim`,
`EzScroller`, `EzSearchPlus`, `EzSortableList`, `EzSplitButton`, `EzSplitPanel`,
`EzTagInput`, `EzTextEdit`, `EzTileMedium` (único criado após auditoria
completa), `EzTimeInput`, `EzTree`, `EzUnderface`.

## Como decidir no futuro

1. Nome `ez-*` novo apareceu numa spec da Sankhya? Procurar primeiro em
   `apps/web/src/components/ds/` por equivalente funcional.
2. Existe equivalente com API diferente? Documentar aqui na tabela acima —
   **não** criar duplicata com API Sankhya idêntica.
3. Não existe equivalente funcional? Criar componente novo seguindo o padrão
   do DS (`forwardRef`, `cn()`, tokens `brand-*`/`gray-*`, JSDoc nas props,
   testes com ≥3 casos, story Storybook).

## Convenção: cadastro em modo formulário (dados oficiais travados + proporção)

Decisão tomada no cadastro de Clientes (`OrganizationsPage.tsx`, DMTE-11) e que
vale para qualquer tela futura de cadastro ("modo formulário") que busque dados
de uma fonte externa oficial (ex.: CNPJ/Razão Social via Receita Federal):

- **Campo vindo de fonte oficial externa fica travado (`disabled`) após a
  busca ter sucesso**, com uma ação explícita ("Editar manualmente") para
  destravar. Nunca travar o campo *antes* da busca — cadastro 100% manual
  (sem consultar a fonte externa) continua livre, sempre.
- **Campo de texto longo (nome/razão social) ocupa o dobro da largura de
  campo de código/identificador** (`colSpan`/grid proporcional), evitando a
  grade "quadriculada" genérica onde todo campo tem a mesma largura.

Essa convenção **não está em um componente compartilhado** — `EzEntityForm`
(`apps/web/src/components/ds/EzEntityForm.tsx`) é genérico por desenho (recebe
um `schema` via prop, sem vínculo com nenhuma entidade específica), mas hoje
nenhuma tela em produção o usa; cada tela de cadastro (Clientes, Mesas,
Chamados, Contratos) tem seu próprio formulário. Migrar para um componente
compartilhado seria abstração prematura com um único consumidor real. Decisão:
replicar esta convenção manualmente em cada tela que precisar dela até existir
um **segundo** caso de uso real — nesse momento, extrair para o `EzEntityForm`
(adicionando `readOnly` ao schema de campo) passa a valer a pena.

## Paleta única e escala de proporção na aba Tickets (DMTE-427 fatia 1)

ADR `docs/adr/0001-paleta-unica-brand-na-aba-tickets.md`. Decisão I1/D5/D6,
fechada pelo Developer na fatia 1 com medidas reais, não com os valores
hipotéticos (36px/8px) da SPEC v2 — a SPEC marcava esses números como
`[Proposta]`, a serem fixados por quem implementasse com a renderização real.

- **Paleta**: a aba Tickets (`apps/web/src/pages/Ticket*.tsx`,
  `CreateTicketPage.tsx`, `apps/web/src/components/tickets/*.tsx`) usa somente
  `brand-*` e as paletas semânticas do DS (`gray-*`, `green-*`, `yellow-*`,
  `red-*`, `petroleum-*`). Sem hex literal, sem `teal-*`/`emerald-*`/`rose-*`,
  sem grau de `gray` fora da escala do DS (`gray-50`, `gray-950` etc. — o DS
  define apenas 70/80/90/100/200…900/1000). Verificado em CI por
  `scripts/check_tickets_palette.py` (AC-01).
- **Altura de controle** (`--control-height-md: 42px`,
  `--control-height-compact: 32px`, em `apps/web/src/styles.css`): os mesmos
  valores que `EzButton`/`EzTextInput`/`EzSearch`/`EzComboBox`/`EzDateInput`
  já usam como tamanho "medium"/"small"/"slim" — nenhum valor novo. A
  inconsistência real (`h-[34px]`/`h-[38px]` ad hoc na toolbar do Kanban, da
  Lista e do cabeçalho) foi normalizada para esses dois. Verificado em CI por
  `scripts/check_tickets_proportion.py` (AC-02).
- **Raio e sombra** (`--radius-control: 10px`, `--radius-card: 16px`,
  `--shadow-card`, `--shadow-popover`, também em `styles.css`, geram as
  utilities `rounded-control`, `rounded-card`, `shadow-card`,
  `shadow-popover`): documentados nesta fatia, com `rounded-control` e
  `shadow-popover` já aplicados aos controles e popovers da toolbar que
  tiveram a altura normalizada (Mesa, Ordenar, Configurações e seus menus no
  Kanban; busca e Busca avançada no cabeçalho; Exibir colunas na Lista).
  `rounded-card` e `shadow-card` ficam definidos, documentados na story e sem
  consumidor em código de produto ainda — aplicá-los a cartões do Kanban,
  chips e badges de outras superfícies da aba é trabalho das fatias 2–6 (cada
  uma já toca essas superfícies com seus próprios ACs); não foi replicado às
  cegas aqui sem captura de tela para comparar.
- Story de documentação: `apps/web/src/components/ds/EzDesignTokens.stories.tsx`
  (`DS/Tokens de proporção (D6)`).

## Chip de prazo no Kanban (DMTE-427 fatia 2)

O cartão do Kanban mostrava o SLA como pílulas largas ("Resposta: Dentro do prazo"), empilhadas. A fatia 2 troca isso por `EzSlaChip` (`apps/web/src/components/ds/EzSlaChip.tsx`): ícone (resposta ou resolução) + tempo restante, negativo quando vencido, com o texto completo no nome acessível e no tooltip.

- Sem equivalente oficial no Sankhya: `EzTag` leva só texto e ícone fixo, sem cálculo de tempo. O chip é novo, não uma variante de `EzTag`, para não mexer em outras telas que usam `EzTag` (risco R1 da SPEC).
- Cores: pares `green-800/green-100`, `yellow-800/yellow-100` e `red-800/red-100`, todos do DS. O teste do chip confere contraste mínimo AA (4.5:1) lendo os tokens de `styles.css`.
- Dados: usa o estado já calculado pelo backend (`responseSlaStatus`/`resolveSlaStatus`) e os prazos que o ticket já tem. Sem prazo conhecido, mostra só ícone e estado. Nos dois prazos (resposta e resolução), o tempo soma as pausas acumuladas e a pausa em curso, na mesma regra de `getSlaStatus` (apps/api), para não contradizer o estado. Sem mudança de API.
- `SlaBadge` continua no detalhe do ticket e passa a delegar ao chip quando o detalhe for tratado (fatia 5).
- Story: `EzSlaChip.stories.tsx`. Testes: `EzSlaChip.test.tsx`.
- Coluna do Kanban com 290px (antes 320px, `w-80`).

## Controle segmentado Lista/Kanban (DMTE-427 fatia 3)

O alternador Lista/Kanban do cabeçalho de Tickets era um par de botões com classes próprias, sem estado exposto a leitor de tela. A fatia 3 troca isso por `EzSegmented` (`apps/web/src/components/ds/EzSegmented.tsx`).

- Verificado antes de criar (I2 da SPEC): `EzTabs` não cobre o caso. Ele expõe `role="tab"` e `aria-selected`, o que pressupõe painéis de aba, e o alternador troca a visão do mesmo conteúdo. As variantes `line` e `pills` também não têm o formato segmentado, e o `EzTabs` não emite `aria-pressed` nem usa a altura de controle. O raio do container passa a ser `rounded-control` (10px), no lugar do `rounded-[8px]` antigo, pela escala da fatia 1.
- `EzSegmented` é um grupo nomeado (`role="group"` com `aria-label`) de botões com `aria-pressed`, altura do token `--control-height-md` (alinhado com Buscar e Busca avançada) e anel de foco visível. Opção pode ser desabilitada.
- `EzTabs` não foi alterado. Os testes que buscavam os botões "Lista" e "Kanban" por papel `button` seguem valendo.
- Story: `EzSegmented.stories.tsx`. Testes: `EzSegmented.test.tsx` (5 casos), `TicketsHeader.test.tsx` e `TicketsPage.test.tsx`.

## Lista, filtros ativos e paginação (DMTE-427 fatia 4)

Nenhum componente novo no DS nesta fatia; só reaproveitamento.

- **Filtros ativos** (`TicketActiveFilters`, em `components/tickets`, não no DS): chips com `EzTag` (variante `gray`) e a ação "Redefinir filtros" com `EzButton` (`tertiary`). Mostra só filtros que a tela já suportava (URL e Busca avançada); filtro que guarda só um id mostra o nome do campo ("Cliente", "Mesa de serviço"), não o valor. Página, ordenação e o filtro por avatar do Kanban não contam. Fica visível também durante o carregamento e quando a consulta falha, para dar para limpar um filtro que quebra a lista.
- **Paginação:** "Anterior" e "Próxima" passam de botões nativos com classes próprias para `EzButton` (`secondary`, `small`). Comportamento e nomes acessíveis iguais; os testes existentes seguem valendo.
- **Grupos da Lista:** o botão do cabeçalho do grupo continua um `<button>` nativo (uma linha de tabela clicável não tem equivalente no DS), agora com chevron e `aria-expanded`, `rounded-control` e anel de foco por token.
- **Fora desta fatia:** linhas de altura fixa e contagem do grupo mais discreta (D10) ficam para a fatia 7, que revisa as capturas por largura; o ajuste visual depende do aceite do Alfredo.

## Busca avançada e Criar ticket (DMTE-427 fatia 5)

As duas telas já usavam `EzComboBox`, `EzTextInput`, `EzButton` e `EzCardItem`. A fatia 5 troca só o que ainda fugia do DS; nenhum componente novo.

- **Filtros adicionais da Busca avançada:** os quatro checkboxes nativos (Meus, Não atendidos, Pausados, Vencidos) passam para `EzCheck`, com `id` e rótulo próprios. O mapeamento para `mine`/`unassigned`/`paused`/`overdue` não mudou. O bloco que abre e recolhe esses filtros usa `EzCollapsibleBox` (cabeçalho com `aria-expanded` e chevron), no lugar do `<details>`/`<summary>` nativo; o DS já tinha esse componente, e a justificativa anterior de que não havia equivalente estava errada. O formulário passa de `max-w-3xl` para `max-w-5xl` com três colunas em telas largas (o intervalo De/Até ocupa duas).
- **Criar ticket:** o banner de erro do formulário passa a ser `EzAlert` (`error`), que tem `role="alert"` e é anunciado por leitor de tela. O cartão do formulário usa os tokens `rounded-card` e `shadow-card` da fatia 1, no lugar do raio e da sombra literais. "Voltar para o catálogo" e "Meu problema não está catalogado" passam de botões nativos para `EzButton` (`tertiary`); o botão do item do catálogo usa `rounded-card`.
- **Comportamento:** igual, com uma única exceção: o erro de envio agora tem `role="alert"` (vem do `EzAlert`). Nomes acessíveis dos botões mantidos.
- **Mudanças visuais, sem captura ainda** (dependem do aceite do Alfredo na fatia 7): o rótulo dos checkboxes passa de 13px para 14px (tamanho fixo do `EzCheck`); o título "Filtros adicionais" passa de 13px médio para 14px semibold, dentro de uma caixa com raio de 12px e chevron (do `EzCollapsibleBox`), e o conteúdo ganha divisória e mais respiro. Comportamento: o `EzCollapsibleBox` desmonta o conteúdo quando recolhido (o `<details>` o mantinha no DOM), então os checkboxes saem da tela, do foco e da árvore de acessibilidade enquanto fechado; o estado continua no formulário da página e o que foi marcado volta marcado ao reabrir (teste de caracterização, sem RED, em `TicketAdvancedSearchPage.collapsible.test.tsx`); a Busca avançada fica mais larga (`max-w-5xl`, três colunas em tela larga), o que é uma proposta, não um pedido da SPEC; "Meu problema não está catalogado" deixa de ser texto sublinhado cinza e vira um botão `tertiary` na cor de marca, que pode quebrar linha em tela estreita; "Voltar para o catálogo" passa a ser o botão quadrado do `EzButton` sem rótulo, com o nome acessível no `aria-label`.
- **Continua nativo, de propósito:** o `<button>` de cada serviço do catálogo (o `EzButton` não tem formato de linha de cartão). DMTE-485: o catálogo passa a ter um `EzCardItem` por categoria (`role="region"` rotulada pelo título), com os serviços numa lista de botões nativos dentro dele, em 1/2/3 colunas (`columns-*`, `break-inside-avoid`). O botão "Meu problema não está catalogado" é um `EzButton` terciário no cabeçalho, com `className` para quebrar linha no celular (`h-auto whitespace-normal`); o seletor de Cliente é um `EzSearch`.

## Detalhe do ticket (DMTE-427 fatia 6)

Nenhum componente novo no DS. A paleta do detalhe já estava limpa desde a fatia 1 (a checagem estática cobre `TicketDetailPage`, `TicketCsat` e `TicketWorklogs`); esta fatia troca o que ainda fugia do DS em forma, raio e acessibilidade.

- **Avaliação (CSAT), acessibilidade:** as cinco estrelas eram cinco botões com o mesmo nome acessível ("★") e sem estado. Agora são um grupo nomeado por `aria-labelledby` (rótulo visível "Nota", que deixou de ser um `<label>` sem controle e virou um `<span>`) com botões "Nota N de 5" e `aria-pressed` na escolhida. Na visão só de leitura, a nota vira um único `role="img"` ("Nota 4 de 5") em vez de cinco botões desabilitados, o que também tira o hover e o cursor padrão que eles tinham. É uma mudança de comportamento (semântica), com testes, e a única da fatia além de trocas de componente. Escolhi grupo com `aria-pressed`, como o `EzSegmented`; um `radiogroup` (ou o `EzRadioButton`) seria semanticamente mais exato para escolha única, mas pede setas de teclado e foco móvel, e fica como melhoria futura.
- **Avaliação (CSAT), visual:** "Enviar Avaliação", "Cancelar" e "Alterar Nota" passam a `EzButton`; as estrelas ganham anel de foco e `rounded-control`; o cartão usa `rounded-card`, `shadow-card` e `border-gray-100`.
- **Abas do detalhe:** os cinco botões de ação sem comportamento ainda ("+ Compromisso", "+ Valor extra", "+ Assinatura", "+ Criar issue", "+ Associar issue") passam de botões nativos com raio de 6px para `EzButton`. Os rótulos e o fato de não terem ação continuam iguais.
- **Raios:** `rounded-[8px]` e `rounded-[10px]` do `TicketDetailPage` e do `TicketWorklogs` passam a `rounded-control`. Ficam literais, de propósito, os raios de 6px e 4px do `TicketWorklogs` (botões pequenos e checkboxes dentro de um arquivo de 1700 linhas, risco R6 da SPEC); eles pertencem a uma revisão própria depois do aceite visual.
- **Continua nativo:** os dois `<select>` do cabeçalho do ticket (Status e Atribuído a), os botões do `TicketWorklogs` e o `<textarea>` do CSAT. Trocá-los por `EzComboBox` e `EzButton` mexe no layout do cabeçalho e do apontamento, que não tenho como validar sem captura.
- **Mudança visual sem captura:** botões `EzButton` ocupam a altura do DS, então ficam um pouco maiores que os de 12px anteriores. Depende do aceite da fatia 7.

### Ainda pendente para a fatia 7 (conferido por `grep`, sem captura)

A fatia 6 não zerou o AC-12 no detalhe. O que continua fora dos tokens ou do DS, para decidir com as capturas por largura:

- **Raios fora de token** (`rounded-lg`, `rounded` simples, `rounded-[6px]`, `rounded-[4px]`): `TicketDetail` (2), `TicketComments` (1), `TicketAttachments` (3), `TicketChecklist` (2 + 1), `TicketParent` (3 + 1), `CommentForm` (1), `TicketCsat` (1 + 1) e `TicketWorklogs` (18 `rounded` simples e 10 `rounded-[Npx]` de 6px e 4px). Não troquei porque cada um pode virar `rounded-control` (10px) ou `rounded-card` (16px) conforme o papel (campo, cartão, chip), e escolher sem ver a tela é chute.
- **Controles nativos estilizados à mão:** os dois `<select>` do cabeçalho do ticket (Status e Atribuído a), os 18 botões e 3 inputs do `TicketWorklogs`, o botão de `TicketParent`, o input de `TicketAttachments`, o `<textarea>` da CSAT e o botão redondo de parar o pré-apontamento no `TicketDetailPage`.
- **Cor semântica de erro** (`text-red-*`) em anexos, checklist e parent: usa a paleta do DS e passa na checagem estática; fica só como registro.

## Responsividade e celular (DMTE-427 fatia 7)

Nenhum componente novo no DS. Por decisão do Alfredo (2026-11-08), o celular entrou no escopo, medido em 390px, e com ele o shell global. Capturas por largura (1440, 1280, 1024, 768 e 390px) com dados sintéticos e API simulada no navegador, mostrando as telas Kanban, Lista, Lista com filtros, Busca avançada, Criar ticket e Detalhe, mais o menu aberto em 390px.

O que a primeira captura mostrou em 390px: a barra lateral fixa de 240px ocupava 62% da tela e deixava cerca de 150px para o conteúdo; o campo de busca e o botão "Busca avançada" saíam da tela; o título do detalhe ficava numa coluna de 150px e se sobrepunha ao seletor "Atribuído a". Em qualquer largura, os cartões do Kanban mostravam um marcador de lista (`•`) e a barra lateral terminava antes do fim da tela.

- **Menu retrátil (AC-17):** abaixo de 768px o menu lateral some e o cabeçalho ganha o botão "Abrir menu" (44px, `aria-expanded`, `aria-controls`). O painel é um `role="dialog"` modal com foco que entra ao abrir e volta ao botão ao fechar, botão "Fechar menu" visível e fechamento por Esc, toque fora ou ao escolher um destino. Dentro dele o botão "Esconder" não existe (não faz sentido em tela pequena). Desde 768px o menu continua fixo, agora `sticky` com altura da tela, o que corrige a barra que terminava antes do fim.
- **Cabeçalho e conteúdo:** margem do conteúdo de 12px no celular (24px desde 640px); título e busca do cabeçalho da aba quebram em linhas (busca ocupa a linha inteira no celular).
- **Kanban:** cartões sem marcador de lista.
- **Lista:** a tabela ganha largura mínima de 720px e rola na horizontal dentro de uma região focável e nomeada ("Tabela de chamados"), em vez de espremer as colunas; o número do chamado não quebra linha e o título tem largura mínima.
- **Detalhe:** título, seletores de status e de responsável se empilham no celular.
- **Busca avançada e Criar ticket:** já cabiam em 390px, sem mudança.

- **Acessibilidade do menu (achados da revisão `web-design-guidelines` e do code-review):** com o painel aberto, o resto da página fica `inert` (Tab e leitor de tela não saem do painel), a rolagem do fundo é travada, e o painel se fecha sozinho se a tela crescer até 768px, para a barra fixa e o painel nunca coexistirem.
- **Detalhes pequenos que também mudaram:** campo de busca do cabeçalho com `name="search"` e `autoComplete="off"`; título do detalhe de 24px para 20px até 640px, com quebra de palavra; painel do menu com largura máxima de 85% da tela; tabela da Lista com `min-w-[720px]`, número do chamado sem quebra e título com largura mínima de 14rem; borda da região da tabela passa de `rounded-[10px]` para `rounded-control`.
- **Outras páginas do shell (Dashboard, Relatórios, Clientes, Mesa, Contratos, Agenda, Configurações e Conhecimentos):** capturadas em 390px e 768px só para medir rolagem horizontal da página (nenhuma passou da largura) e olhadas por amostra (Dashboard e Contratos usáveis). Não foram ajustadas nem validadas ponta a ponta; o menu retrátil e a margem de 12px valem para elas.

Não foi feito, de propósito: (a) menu recolhido por padrão entre 768px e 1023px (o menu fixo de 240px funciona, e o botão "Esconder" recolhe); (b) a lista de raios fora de token e controles nativos do detalhe registrada na seção da fatia 6, que continua pendente e não ganhou captura de decisão; (c) tabela da Lista em cartões no celular (hoje rola na horizontal). Não testado: toque real em aparelho, orientação paisagem e Safari; as capturas são do Chromium com viewport emulado.
