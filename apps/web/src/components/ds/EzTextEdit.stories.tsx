import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTextEdit } from './EzTextEdit';

/**
 * Aponta DS Text Edit — texto clicável que vira um input editável inline;
 * Enter ou blur salva, Escape cancela. Usado para renomear título de chamado
 * e nome de fila diretamente na listagem.
 */
const meta: Meta<typeof EzTextEdit> = {
  title: 'DS/EzTextEdit',
  component: EzTextEdit,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTextEdit>;

export const Default: Story = {
  args: {
    id: 'text-edit-default',
    value: 'Impressora do financeiro sem toner',
    onChange: () => undefined,
  },
};

export const ComOnSave: Story = {
  args: {
    id: 'text-edit-onsave',
    value: 'Fila N1 — Suporte técnico',
    onChange: () => undefined,
    onSave: () => undefined,
  },
};

export const Vazio: Story = {
  args: {
    id: 'text-edit-vazio',
    value: '',
    onChange: () => undefined,
    placeholder: 'Clique para informar o título do chamado',
  },
};

export const Disabled: Story = {
  args: {
    id: 'text-edit-disabled',
    value: 'Chamado encerrado em 31/12/2025',
    onChange: () => undefined,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('ERP Sankhya lento no faturamento');
      return (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-gray-500">
            Clique no título para editar. Enter ou clique fora salva; Escape cancela.
          </span>
          <EzTextEdit id="text-edit-interactive" value={value} onChange={setValue} />
        </div>
      );
    }
    return <Demo />;
  },
};
