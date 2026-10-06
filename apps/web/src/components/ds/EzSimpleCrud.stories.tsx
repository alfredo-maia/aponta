import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ColumnDef } from '@tanstack/react-table';
import { EzSimpleCrud } from './EzSimpleCrud';
import type { EzEntityFormField } from './EzEntityForm';
import { EzTag } from './EzTag';

/**
 * Aponta DS Simple Crud — espelha o comportamento visual/UX do
 * `snk-simple-crud` (Sankhya DS): alterna entre uma visualização em GRADE
 * (`EzEntityGrid`) e uma visualização em FORMULÁRIO (`EzEntityForm`), com
 * uma `EzTaskbar` controlando a navegação (INSERT abre o formulário vazio,
 * clicar numa linha abre o formulário preenchido, SAVE/CANCEL voltam para a
 * grade). Suporta dois modos: `IN_MEMORY` (dados geridos localmente pelo
 * chamador) e `SERVER` (delega a callbacks assíncronos `onFetch`/`onSave`/
 * `onDelete`). Sem qualquer dependência de `SnkApplication`/`DataUnit`/
 * `configName`.
 */
type Ticket = {
  id: string;
  title: string;
  client: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
};

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
];

const fields: EzEntityFormField[] = [
  { name: 'id', label: 'Chamado', type: 'text', required: true },
  { name: 'title', label: 'Título', type: 'text', required: true },
  { name: 'client', label: 'Cliente', type: 'text' },
  {
    name: 'priority',
    label: 'Prioridade',
    type: 'select',
    options: [
      { label: 'Baixa', value: 'Baixa' },
      { label: 'Média', value: 'Média' },
      { label: 'Alta', value: 'Alta' },
      { label: 'Crítica', value: 'Crítica' },
    ],
  },
];

const initialTickets: Ticket[] = [
  { id: '#4821', title: 'Falha no servidor de produção', client: 'Social Tecnologia', priority: 'Crítica' },
  { id: '#4822', title: 'Impressora não liga no setor financeiro', client: 'Metalúrgica Vale', priority: 'Baixa' },
  { id: '#4823', title: 'Erro ao salvar chamado de manutenção', client: 'Construtora Horizonte', priority: 'Alta' },
];

const getId = (item: Ticket) => item.id;
const createEmptyItem = (): Ticket => ({ id: '', title: '', client: '', priority: 'Baixa' });

const meta: Meta<typeof EzSimpleCrud> = {
  title: 'DS/EzSimpleCrud',
  component: EzSimpleCrud,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSimpleCrud>;

function InMemoryDemo() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  return (
    <EzSimpleCrud
      columns={columns}
      fields={fields}
      mode="IN_MEMORY"
      data={tickets}
      onDataChange={setTickets}
      getId={getId}
      createEmptyItem={createEmptyItem}
    />
  );
}

export const EmMemoria: Story = {
  render: () => <InMemoryDemo />,
};

function ServerDemo() {
  const onFetch = () =>
    new Promise<Ticket[]>((resolve) => {
      setTimeout(() => resolve(initialTickets), 800);
    });

  const onSave = (item: Ticket) =>
    new Promise<Ticket>((resolve) => {
      setTimeout(() => resolve(item.id ? item : { ...item, id: `#${Math.floor(Math.random() * 9000 + 1000)}` }), 500);
    });

  const onDelete = (_id: string | number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });

  return (
    <EzSimpleCrud
      columns={columns}
      fields={fields}
      mode="SERVER"
      onFetch={onFetch}
      onSave={onSave}
      onDelete={onDelete}
      getId={getId}
      createEmptyItem={createEmptyItem}
    />
  );
}

export const ConectadoAoServidor: Story = {
  render: () => <ServerDemo />,
};

function ComConfiguradorDemo() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  return (
    <EzSimpleCrud
      columns={columns}
      fields={fields}
      mode="IN_MEMORY"
      data={tickets}
      onDataChange={setTickets}
      getId={getId}
      createEmptyItem={createEmptyItem}
      onOpenConfigurator={() => window.alert('Abrir configurador de layout (fora do escopo deste componente)')}
    />
  );
}

export const ComBotaoConfigurador: Story = {
  render: () => <ComConfiguradorDemo />,
};
