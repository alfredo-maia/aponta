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
