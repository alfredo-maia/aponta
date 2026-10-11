import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ColumnDef } from '@tanstack/react-table';
import { EzEntityGrid } from './EzEntityGrid';
import { EzTag } from './EzTag';
import type { FilterDef } from './EzFilterBar';

/**
 * Aponta DS Entity Grid — espelha o comportamento visual do `snk-grid`
 * (Sankhya DS): colunas ordenáveis, seleção múltipla, taskbar de ações,
 * barra de filtros e paginação simples — composto a partir de
 * `EzGridWrapper` + `@tanstack/react-table`, `EzTaskbar` e `EzFilterBar`.
 * Totalmente genérico: sem dependência de `SnkApplication` / `DataUnit`.
 */
type Ticket = {
  id: string;
  title: string;
  client: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: 'Aberto' | 'Em andamento' | 'Resolvido';
  createdAt: string;
  amount: number;
};

const tickets: Ticket[] = [
  { id: '#4821', title: 'Falha no servidor de produção', client: 'Social Tecnologia', priority: 'Crítica', status: 'Em andamento', createdAt: '09/01/2026', amount: 1250.9 },
  { id: '#4822', title: 'Impressora não liga no setor financeiro', client: 'Metalúrgica Vale', priority: 'Baixa', status: 'Aberto', createdAt: '09/01/2026', amount: 320 },
  { id: '#4823', title: 'Erro ao salvar chamado de manutenção', client: 'Construtora Horizonte', priority: 'Alta', status: 'Aberto', createdAt: '08/01/2026', amount: 980.5 },
  { id: '#4824', title: 'Acesso ao sistema negado para novo usuário', client: 'Social Tecnologia', priority: 'Média', status: 'Resolvido', createdAt: '07/01/2026', amount: 150 },
  { id: '#4825', title: 'Lentidão no módulo de faturamento', client: 'Comércio Rio Branco', priority: 'Alta', status: 'Em andamento', createdAt: '06/01/2026', amount: 2100 },
  { id: '#4826', title: 'Solicitação de novo relatório gerencial', client: 'Metalúrgica Vale', priority: 'Baixa', status: 'Aberto', createdAt: '05/01/2026', amount: 60.3 },
];

const columns: ColumnDef<Ticket>[] = [
  { accessorKey: 'id', header: 'Chamado' },
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'client', header: 'Cliente' },
  {
    accessorKey: 'priority',
    header: 'Prioridade',
    cell: ({ row }) => {
      const colorByPriority: Record<Ticket['priority'], 'red' | 'yellow' | 'ocean' | 'gray'> = {
        Crítica: 'red',
        Alta: 'yellow',
        Média: 'ocean',
        Baixa: 'gray',
      };
      return <EzTag label={row.original.priority} variant={colorByPriority[row.original.priority]} />;
    },
  },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Aberto em' },
  { accessorKey: 'amount', header: 'Valor (R$)' },
];

const meta: Meta<typeof EzEntityGrid<Ticket>> = {
  title: 'DS/EzEntityGrid',
  component: EzEntityGrid<Ticket>,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzEntityGrid<Ticket>>;

export const Basico: Story = {
  args: {
    columns,
    data: tickets,
  },
};

export const ComTaskbarESelecao: Story = {
  args: {
    columns,
    data: tickets,
    selectable: true,
    taskbarButtons: ['INSERT', 'CLONE', 'REMOVE', 'DIVIDER', 'CONFIGURATOR'],
    onTaskbarAction: () => undefined,
    onSelectionChange: () => undefined,
  },
};

const filtros: FilterDef[] = [
  { id: 'status', label: 'Status', category: 'Chamado', value: 'Aberto', active: true },
  { id: 'prioridade', label: 'Prioridade', category: 'Chamado', value: 'Alta', active: true, pinned: true },
  { id: 'cliente', label: 'Cliente', category: 'Relacionamento', value: '', active: false },
];

export const ComFiltrosEPaginacao: Story = {
  args: {
    columns,
    data: tickets,
    filters: filtros,
    onFilterChange: () => undefined,
    onApplyAll: () => undefined,
    taskbarButtons: ['INSERT', 'MORE_OPTIONS'],
    onTaskbarAction: () => undefined,
    pageSize: 3,
  },
};

export const CompletoComSelecao: Story = {
  args: {
    columns,
    data: tickets,
    filters: filtros,
    onFilterChange: () => undefined,
    onApplyAll: () => undefined,
    taskbarButtons: ['INSERT', 'CLONE', 'REMOVE', 'DIVIDER', 'CONFIGURATOR'],
    onTaskbarAction: () => undefined,
    selectable: true,
    onSelectionChange: () => undefined,
    pageSize: 4,
  },
};

/**
 * Linha de totais no rodapé (`footerAggregations`), equivalente à barra de
 * somatórios (Receita/Despesa/Saldo) vista na tela "Movimentação
 * Financeira" do Sankhya. Formata números no padrão pt-BR (2 casas
 * decimais, separador de vírgula).
 */
export const ComTotaisNoRodape: Story = {
  args: {
    columns,
    data: tickets,
    footerAggregations: { amount: 'sum' },
  },
};

/**
 * Colunas fixadas (`pinnedColumns`), equivalente ao recurso "pinned columns"
 * do AG Grid Enterprise usado nas telas financeiras do Sankhya: as colunas
 * "Chamado" e "Cliente" ficam fixas à esquerda (empilhadas sem sobrepor,
 * via offset cumulativo medido em runtime) e "Valor (R$)" à direita,
 * enquanto o restante rola horizontalmente (visível reduzindo a largura
 * da viewport do Storybook). Combinável com `footerAggregations` — o
 * rodapé também respeita o pinning.
 */
export const ComColunasFixadas: Story = {
  args: {
    columns,
    data: tickets,
    pinnedColumns: { left: ['id', 'client'], right: ['amount'] },
    footerAggregations: { amount: 'sum' },
  },
};

/**
 * Agrupamento de linhas (`groupBy`), equivalente ao "Row Grouping" do AG Grid
 * Enterprise usado nas telas financeiras do Sankhya: os tickets são
 * agrupados por "Prioridade" em linhas-resumo colapsadas (rótulo + contador
 * de registros) que expandem ao clique para revelar as linhas individuais.
 * Apenas um nível de agrupamento é suportado nesta versão.
 */
export const AgrupadoPorPrioridade: Story = {
  args: {
    columns,
    data: tickets,
    groupBy: ['priority'],
  },
};

/**
 * Densidade confortável (`density="comfortable"`), permitindo altura de linha
 * relaxada (py-3, ~44-48px) em vez da densidade compacta padrão do Sankhya
 * ERP (~25px com py-1/py-1.5).
 */
export const DensidadeConfortavel: Story = {
  args: {
    columns,
    data: tickets,
    density: 'comfortable',
  },
};

/**
 * Paginação rica ("1-5 de 5" com seletor de linhas por página) e barra de
 * rolagem horizontal estilo AG Grid sempre visível quando houver transbordo
 * horizontal, em paridade visual com as telas de Despesas/Financeiro do Sankhya (#62).
 */
export const PaginacaoRicaEScrollbarFixa: Story = {
  args: {
    columns,
    data: tickets,
    pageSize: 3,
    pageSizeOptions: [3, 5, 10, 20],
    alwaysShowHorizontalScrollbar: true,
  },
};

/**
 * Filtro por coluna estilo Excel (ícone de funil no cabeçalho com popover
 * de pesquisa rápida e checklist de valores únicos com contadores).
 */
export const FiltroPorColunaEstiloExcel: Story = {
  args: {
    columns,
    data: tickets,
    enableColumnFilters: true,
    showStatusBar: true,
  },
};

/**
 * Barra de status com contadores e métricas de seleção (paridade Excel / Sankhya / AG Grid):
 * exibe total de linhas, quantidade selecionada e, ao selecionar registros com colunas
 * numéricas, calcula dinamicamente Contagem, Soma e Média.
 */
export const StatusBarEContadores: Story = {
  args: {
    columns,
    data: tickets,
    selectable: true,
    showStatusBar: true,
    footerAggregations: { amount: 'sum' },
  },
};

/**
 * Paridade Completa com a grade Sankhya JS / AG Grid (snk-grid):
 * - Menu da grade (ag-grid-menu) no canto superior direito (localizar coluna, densidade, limpar filtros, configurar colunas, estatísticas)
 * - Menu de contexto por coluna (ordenar asc/desc, filtrar, fixar à esquerda, agrupar)
 * - Indicadores visuais de ordenação Sankhya (borda superior verde/vermelha)
 * - Filtro Excel por coluna com abas "Todos" e "Filtrados [QTD]"
 * - Modal de Estatísticas da Grade (ocorrências, soma, média, mín, máx)
 * - Modal de Configuração de Colunas (visibilidade e restaurar padrão)
 * - Faixas zebradas e divisores de células verticais (#e2e6e8)
 */
export const SankhyaGridParity: Story = {
  args: {
    columns,
    data: tickets,
    selectable: true,
    showStatusBar: true,
    showGridCornerMenu: true,
    enableColumnMenu: true,
    enableColumnFilters: true,
    zebraStriping: true,
    footerAggregations: { amount: 'sum' },
    pinnedColumns: { left: ['id'] },
    taskbarButtons: ['INSERT', 'CLONE', 'REMOVE', 'DIVIDER', 'CONFIGURATOR'],
  },
};

/**
 * Densidade Compacta Sankhya ERP (20px - 24px):
 * Otimizado para operadores de alta produtividade visualizarem dezenas de linhas simultâneas,
 * com divisores verticais de célula (#e2e6e8), cabeçalho sóbrio (#f5f7f8) e tipografia condensada.
 */
export const ModoCompactoERP: Story = {
  args: {
    columns,
    data: tickets,
    density: 'compact',
    zebraStriping: true,
    enableColumnFilters: true,
    showStatusBar: true,
    footerAggregations: { amount: 'sum' },
  },
};

/**
 * Totalizadores de Rodapé e Estatísticas Dinâmicas:
 * Exibe agregadores de colunas (Soma do valor financeiro), contagem de registros na barra de status
 * e permite abrir a modal de Estatísticas pelo menu de canto (snk-grid ag-grid-menu).
 */
export const TotalizadoresEAgregacoes: Story = {
  args: {
    columns,
    data: tickets,
    selectable: true,
    showStatusBar: true,
    showGridCornerMenu: true,
    footerAggregations: { amount: 'sum' },
  },
};

/**
 * Múltipla Seleção com Cálculo em Tempo Real no Rodapé:
 * Ao selecionar múltiplos registros com checkboxes (ou Shift+Click), a barra de status
 * calcula e exibe dinamicamente: Contagem de linhas selecionadas, Soma e Média das colunas numéricas.
 */
export const MultiplaSelecaoECalculo: Story = {
  args: {
    columns,
    data: tickets,
    selectable: true,
    showStatusBar: true,
    enableColumnMenu: true,
    footerAggregations: { amount: 'sum' },
  },
};

interface Partner {
  id: number;
  name: string;
  tradeName: string;
  doc: string;
  type: string;
  city: string;
  creditLimit: number;
  active: string;
}

const partnerColumns: ColumnDef<Partner>[] = [
  { accessorKey: 'id', header: 'Cód. Parc.' },
  { accessorKey: 'name', header: 'Razão Social' },
  { accessorKey: 'tradeName', header: 'Nome Fantasia' },
  { accessorKey: 'doc', header: 'CNPJ / CPF' },
  { accessorKey: 'type', header: 'Tipo' },
  { accessorKey: 'city', header: 'Cidade' },
  {
    accessorKey: 'creditLimit',
    header: 'Limite Crédito',
    cell: ({ getValue }) => {
      const val = Number(getValue());
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },
  },
  { accessorKey: 'active', header: 'Ativo' },
];

const partners: Partner[] = [
  { id: 1, name: 'Sankhya Gestão de Negócios S/A', tradeName: 'Sankhya', doc: '04.123.456/0001-01', type: 'J', city: 'Uberlândia - MG', creditLimit: 150000, active: 'Sim' },
  { id: 2, name: 'DM Tecnologia da Informação Ltda', tradeName: 'DM Tecnologia', doc: '12.987.654/0001-88', type: 'J', city: 'Belo Horizonte - MG', creditLimit: 85000, active: 'Sim' },
  { id: 3, name: 'Petrobras Distribuidora S/A', tradeName: 'Petrobras', doc: '33.000.167/0001-01', type: 'J', city: 'Rio de Janeiro - RJ', creditLimit: 500000, active: 'Sim' },
  { id: 4, name: 'Ambev Brasil Bebidas Ltda', tradeName: 'Ambev', doc: '07.526.557/0001-00', type: 'J', city: 'São Paulo - SP', creditLimit: 250000, active: 'Sim' },
  { id: 5, name: 'Alfredo Maia Consultoria', tradeName: 'Alfredo Maia', doc: '123.456.789-00', type: 'F', city: 'Uberlândia - MG', creditLimit: 20000, active: 'Sim' },
  { id: 6, name: 'Tech Inovação Eireli', tradeName: 'Tech Inovação', doc: '28.111.222/0001-33', type: 'J', city: 'Curitiba - PR', creditLimit: 45000, active: 'Não' },
];

/**
 * Modelo de Grade Sankhya ERP: Cadastro de Parceiros (br.com.sankhya.core.cad.parceiros)
 * Implementa todos os padrões canônicos da tela de parceiros:
 * - Botões de ação da Taskbar: Incluir (+), Duplicar, Remover (-), Divisor e Configurar Grade
 * - Numeração sequencial de linhas (#)
 * - Coluna de seleção múltipla para operações em lote
 * - Coluna Cód. Parceiro fixada à esquerda
 * - Filtros por coluna estilo Excel com abas (Todos e Filtrados)
 * - Menu da grade no canto superior direito (localizar coluna, densidade, estatísticas)
 * - Barra de status com total de registros e totalizador de limite de crédito (Soma e Média)
 * - Faixas zebradas e divisores verticais de célula (#e2e6e8)
 */
export const CadastroDeParceirosSankhya: Story = {
  render: () => (
    <EzEntityGrid
      columns={partnerColumns as any}
      data={partners as any}
      showRowNumbers
      selectable
      showStatusBar
      showGridCornerMenu
      enableColumnMenu
      enableColumnFilters
      zebraStriping
      density="compact"
      footerAggregations={{ creditLimit: 'sum' }}
      pinnedColumns={{ left: ['id'] }}
      taskbarButtons={['INSERT', 'CLONE', 'REMOVE', 'DIVIDER', 'CONFIGURATOR']}
    />
  ),
};





