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
};

const tickets: Ticket[] = [
  { id: '#4821', title: 'Falha no servidor de produção', client: 'Social Tecnologia', priority: 'Crítica', status: 'Em andamento', createdAt: '09/01/2026' },
  { id: '#4822', title: 'Impressora não liga no setor financeiro', client: 'Metalúrgica Vale', priority: 'Baixa', status: 'Aberto', createdAt: '09/01/2026' },
  { id: '#4823', title: 'Erro ao salvar chamado de manutenção', client: 'Construtora Horizonte', priority: 'Alta', status: 'Aberto', createdAt: '08/01/2026' },
  { id: '#4824', title: 'Acesso ao sistema negado para novo usuário', client: 'Social Tecnologia', priority: 'Média', status: 'Resolvido', createdAt: '07/01/2026' },
  { id: '#4825', title: 'Lentidão no módulo de faturamento', client: 'Comércio Rio Branco', priority: 'Alta', status: 'Em andamento', createdAt: '06/01/2026' },
  { id: '#4826', title: 'Solicitação de novo relatório gerencial', client: 'Metalúrgica Vale', priority: 'Baixa', status: 'Aberto', createdAt: '05/01/2026' },
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
