import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzFilterInput } from './EzFilterInput';

/**
 * Aponta DS Filter Input — busca rápida com ícone de filtro e botão opcional
 * de filtros avançados. Usado no topo das listagens de chamados e clientes.
 */
const meta: Meta<typeof EzFilterInput> = {
  title: 'DS/EzFilterInput',
  component: EzFilterInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzFilterInput>;

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Buscar chamados...',
    onChange: () => undefined,
  },
};

export const ComValor: Story = {
  args: {
    value: 'servidor de produção',
    placeholder: 'Buscar chamados...',
    onChange: () => undefined,
  },
};

export const ComFiltroAvancado: Story = {
  args: {
    value: '',
    placeholder: 'Buscar clientes...',
    onChange: () => undefined,
    onOpenAdvanced: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      return (
        <div className="flex w-full max-w-md flex-col gap-2">
          <EzFilterInput
            value={value}
            onChange={setValue}
            placeholder="Buscar por número, cliente ou assunto..."
            onOpenAdvanced={() => undefined}
          />
          <span className="text-[12px] text-gray-500">
            {value ? `Filtrando por: "${value}"` : 'Digite para filtrar a listagem.'}
          </span>
        </div>
      );
    }
    return <Demo />;
  },
};
