import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzDoubleList, EzDoubleListItem } from './EzDoubleList';

/**
 * Aponta DS Double List — par de listas (disponíveis/selecionados) com
 * botões para mover itens entre as colunas. Usado para atribuir
 * permissões, vincular técnicos a organizações e selecionar categorias
 * de SLA aplicáveis a um chamado.
 */
const meta: Meta<typeof EzDoubleList> = {
  title: 'DS/EzDoubleList',
  component: EzDoubleList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDoubleList>;

const tecnicosDisponiveis: EzDoubleListItem[] = [
  { id: 1, label: 'Maria Silva', description: 'Infraestrutura' },
  { id: 2, label: 'João Pereira', description: 'Suporte N1' },
  { id: 3, label: 'Ana Costa', description: 'Redes' },
];

const tecnicosSelecionados: EzDoubleListItem[] = [
  { id: 4, label: 'Carlos Souza', description: 'Suporte N2' },
];

export const Default: Story = {
  args: {
    available: tecnicosDisponiveis,
    selected: tecnicosSelecionados,
    onAdd: () => undefined,
    onRemove: () => undefined,
  },
};

export const ComLabelsPersonalizadas: Story = {
  args: {
    available: tecnicosDisponiveis,
    selected: tecnicosSelecionados,
    availableLabel: 'Técnicos disponíveis',
    selectedLabel: 'Técnicos atribuídos ao chamado',
    onAdd: () => undefined,
    onRemove: () => undefined,
  },
};

export const ListaDisponivelVazia: Story = {
  args: {
    available: [],
    selected: tecnicosSelecionados,
    onAdd: () => undefined,
    onRemove: () => undefined,
  },
};

export const ListaSelecionadaVazia: Story = {
  args: {
    available: tecnicosDisponiveis,
    selected: [],
    onAdd: () => undefined,
    onRemove: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [available, setAvailable] = useState<EzDoubleListItem[]>(tecnicosDisponiveis);
      const [selected, setSelected] = useState<EzDoubleListItem[]>(tecnicosSelecionados);

      return (
        <EzDoubleList
          availableLabel="Clientes disponíveis"
          selectedLabel="Clientes vinculados ao contrato"
          available={available}
          selected={selected}
          onAdd={(item) => {
            setAvailable((prev) => prev.filter((i) => i.id !== item.id));
            setSelected((prev) => [...prev, item]);
          }}
          onRemove={(item) => {
            setSelected((prev) => prev.filter((i) => i.id !== item.id));
            setAvailable((prev) => [...prev, item]);
          }}
        />
      );
    }
    return <Demo />;
  },
};
