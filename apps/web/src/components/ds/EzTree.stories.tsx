import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTree, type EzTreeNode } from './EzTree';

/**
 * Aponta DS Tree — árvore hierárquica expansível com indentação por nível.
 * Usada no cadastro de categorias de chamado (Hardware, Software, Rede).
 */
const meta: Meta<typeof EzTree> = {
  title: 'DS/EzTree',
  component: EzTree,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTree>;

const categoriasChamado: EzTreeNode[] = [
  {
    id: 'hardware',
    label: 'Hardware',
    children: [
      { id: 'impressora', label: 'Impressora' },
      { id: 'notebook', label: 'Notebook' },
      { id: 'monitor', label: 'Monitor' },
    ],
  },
  {
    id: 'software',
    label: 'Software',
    children: [
      { id: 'erp', label: 'ERP Sankhya' },
      { id: 'crm', label: 'CRM' },
      { id: 'email', label: 'E-mail corporativo' },
    ],
  },
  {
    id: 'rede',
    label: 'Rede e Infraestrutura',
    children: [
      { id: 'vpn', label: 'VPN' },
      { id: 'wifi', label: 'Wi-Fi' },
      { id: 'servidor', label: 'Servidor de arquivos' },
    ],
  },
];

export const Default: Story = {
  args: {
    nodes: categoriasChamado,
    onSelect: () => undefined,
  },
};

export const ExpandidaPorPadrao: Story = {
  args: {
    nodes: categoriasChamado,
    defaultExpandedIds: ['hardware', 'software'],
    onSelect: () => undefined,
  },
};

export const ComSelecao: Story = {
  args: {
    nodes: categoriasChamado,
    defaultExpandedIds: ['hardware'],
    selectedId: 'impressora',
    onSelect: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [selectedId, setSelectedId] = useState<string | number>('erp');
      return (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-gray-500">
            Clique em uma categoria para selecionar o chamado.
          </span>
          <EzTree
            nodes={categoriasChamado}
            defaultExpandedIds={['software']}
            selectedId={selectedId}
            onSelect={(node: any) => setSelectedId(node.id)}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
