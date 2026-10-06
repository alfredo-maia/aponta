import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzSortableList, type EzSortableListItem } from './EzSortableList';

/**
 * Aponta DS Sortable List — lista reordenável por arrastar-e-soltar (drag &
 * drop nativo HTML5, sem biblioteca externa). Usada para ordenar etapas de
 * fluxo de atendimento e prioridades de fila.
 */
const meta: Meta<typeof EzSortableList> = {
  title: 'DS/EzSortableList',
  component: EzSortableList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSortableList>;

const etapasAtendimento: EzSortableListItem[] = [
  { id: 'triagem', label: 'Triagem' },
  { id: 'diagnostico', label: 'Diagnóstico técnico' },
  { id: 'aprovacao', label: 'Aprovação do gerente' },
  { id: 'execucao', label: 'Execução do reparo' },
  { id: 'validacao', label: 'Validação com o cliente' },
];

export const Default: Story = {
  args: {
    items: etapasAtendimento,
    onReorder: () => undefined,
  },
};

export const PoucosItens: Story = {
  args: {
    items: [
      { id: 'alta', label: 'Prioridade alta' },
      { id: 'media', label: 'Prioridade média' },
      { id: 'baixa', label: 'Prioridade baixa' },
    ],
    onReorder: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [items, setItems] = useState<EzSortableListItem[]>(etapasAtendimento);
      return (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-gray-500">
            Arraste os itens para reordenar as etapas do fluxo de atendimento.
          </span>
          <EzSortableList items={items} onReorder={setItems} />
        </div>
      );
    }
    return <Demo />;
  },
};
