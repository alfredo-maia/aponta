import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzMultiSelectionList } from './EzMultiSelectionList';

/**
 * Aponta DS Multi Selection List — lista simples de linhas com checkbox
 * para selecionar múltiplos itens (diferente do `EzMultiSelect`, que é um
 * combobox com tags). Usada em filtros de chamados e seleção de produtos.
 */
const meta: Meta<typeof EzMultiSelectionList> = {
  title: 'DS/EzMultiSelectionList',
  component: EzMultiSelectionList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzMultiSelectionList>;

const produtos = [
  { id: 'nf', label: 'Nota fiscal de serviço' },
  { id: 'fat', label: 'Faturamento quarteirizado' },
  { id: 'est', label: 'Estoque e suprimentos' },
  { id: 'fin', label: 'Financeiro / cobrança' },
  { id: 'rel', label: 'Relatórios gerenciais' },
];

export const Default: Story = {
  args: {
    items: produtos,
    selectedIds: [],
    onChange: () => undefined,
  },
};

export const PreSelecionados: Story = {
  args: {
    items: produtos,
    selectedIds: ['nf', 'fin'],
    onChange: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [selected, setSelected] = useState<string[]>(['fat']);
      return (
        <div className="w-[360px]">
          <EzMultiSelectionList
            items={produtos}
            selectedIds={selected}
            onChange={(ids) => setSelected(ids)}
          />
          <p className="mt-3 text-[12px] text-gray-500 font-medium">
            {selected.length} módulo(s) selecionado(s)
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};
