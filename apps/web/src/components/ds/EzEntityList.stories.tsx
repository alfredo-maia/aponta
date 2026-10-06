import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzEntityList, type EzEntityListItem } from './EzEntityList';

/**
 * Aponta DS Entity List — espelha o `snk-entity-list` do catálogo Sankhya DS.
 * Lista de checkboxes com campo de busca no topo; a busca pode filtrar
 * localmente (sem `onSearch`) ou disparar uma busca assíncrona que adiciona
 * novos itens à lista (via `onSearch`), como no bloco original que permite
 * adicionar parceiros pelo campo de pesquisa.
 */
const meta: Meta<typeof EzEntityList> = {
  title: 'DS/EzEntityList',
  component: EzEntityList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzEntityList>;

const baseItems: EzEntityListItem[] = [
  { id: '1', label: 'Parceiro Ocean Tecnologia', checked: true },
  { id: '2', label: 'Parceiro Social Administrativo', checked: false },
  { id: '3', label: 'Parceiro Mota Refrigeração', checked: false },
  { id: '4', label: 'Parceiro BMC Hyundai', checked: true },
];

export const Default: Story = {
  args: {
    items: baseItems,
    onToggle: () => undefined,
  },
};

export const FiltragemLocal: Story = {
  render: () => {
    function Demo() {
      const [items, setItems] = useState<EzEntityListItem[]>(baseItems);
      const toggle = (id: string) =>
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
        );
      return (
        <EzEntityList items={items} onToggle={toggle} searchPlaceholder="Buscar parceiro..." />
      );
    }
    return <Demo />;
  },
};

export const BuscaAssincrona: Story = {
  render: () => {
    function Demo() {
      const [items, setItems] = useState<EzEntityListItem[]>(baseItems);
      const toggle = (id: string) =>
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
        );
      const search = (text: string) => {
        if (!text) return;
        const alreadyExists = items.some(
          (item) => item.label.toLowerCase() === text.toLowerCase()
        );
        if (alreadyExists) return;
        setItems((prev) => [
          ...prev,
          { id: `new-${prev.length + 1}`, label: `Resultado: ${text}`, checked: false },
        ]);
      };
      return (
        <EzEntityList
          items={items}
          onToggle={toggle}
          onSearch={search}
          searchPlaceholder="Digite para buscar e adicionar..."
        />
      );
    }
    return <Demo />;
  },
};

export const ListaVazia: Story = {
  args: {
    items: [],
    onToggle: () => undefined,
  },
};

export const AlturaMaxima: Story = {
  args: {
    items: [
      ...baseItems,
      { id: '5', label: 'Parceiro Aponta Helpdesk', checked: false },
      { id: '6', label: 'Parceiro Dmtecnologia', checked: false },
      { id: '7', label: 'Parceiro Netlify Docs', checked: false },
    ],
    onToggle: () => undefined,
    maxHeightList: '180px',
  },
};
