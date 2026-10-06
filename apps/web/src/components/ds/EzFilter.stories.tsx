import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzFilter, EzFilterItem } from './EzFilter';

/**
 * Aponta DS Filter — chips de filtros aplicados com remoção individual e
 * botão opcional "Adicionar filtro". Usado acima das listagens de chamados,
 * contratos e clientes do helpdesk.
 */
const meta: Meta<typeof EzFilter> = {
  title: 'DS/EzFilter',
  component: EzFilter,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzFilter>;

const filtrosChamados = [
  { id: 'status', label: 'Status', value: 'Aberto' },
  { id: 'prioridade', label: 'Prioridade', value: 'Alta' },
];

export const Default: Story = {
  args: {
    filters: filtrosChamados,
    onRemove: () => undefined,
  },
};

export const ComBotaoAdicionar: Story = {
  args: {
    filters: [{ id: 'cliente', label: 'Cliente', value: 'Social Tecnologia' }],
    onRemove: () => undefined,
    onAdd: () => undefined,
  },
};

export const Vazio: Story = {
  args: {
    filters: [],
    onRemove: () => undefined,
    onAdd: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [filters, setFilters] = useState<EzFilterItem[]>([
        { id: 'status', label: 'Status', value: 'Em atendimento' },
        { id: 'sla', label: 'SLA', value: 'Em risco' },
        { id: 'equipe', label: 'Equipe', value: 'Infraestrutura' },
      ]);
      return (
        <EzFilter
          filters={filters}
          onRemove={(id) => setFilters((current) => current.filter((f) => f.id !== id))}
          onAdd={() =>
            setFilters((current) => [
              ...current,
              { id: `extra-${current.length}`, label: 'Contrato', value: `CT-2026-0${current.length + 1}` },
            ])
          }
        />
      );
    }
    return <Demo />;
  },
};
