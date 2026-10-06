import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzChip } from './EzChip';

/**
 * Aponta DS Chip — tag removível compacta, usada para filtros aplicados
 * em listagens de chamados (status, prioridade, cliente).
 */
const meta: Meta<typeof EzChip> = {
  title: 'DS/EzChip',
  component: EzChip,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzChip>;

export const Default: Story = {
  args: { label: 'SLA 4h' },
};

export const Removivel: Story = {
  args: { label: 'Prioridade alta', onRemove: () => undefined },
};

export const Verde: Story = {
  args: {
    label: 'Contrato ativo',
    colorClass: 'bg-green-100 text-green-800 border-green-200',
    onRemove: () => undefined,
  },
};

export const Vermelho: Story = {
  args: {
    label: 'SLA estourado',
    colorClass: 'bg-red-100 text-red-800 border-red-200',
    onRemove: () => undefined,
  },
};

export const Desabilitado: Story = {
  args: { label: 'Cliente VIP', disabled: true, onRemove: () => undefined },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [filters, setFilters] = useState(['Abertos', 'Suporte', 'SLA 4h', 'Urgente']);
      return (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <EzChip
              key={filter}
              label={filter}
              onRemove={() => setFilters((prev) => prev.filter((f) => f !== filter))}
            />
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};
