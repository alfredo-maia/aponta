import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzAdvancedSearch, type SearchResultItem, type SearchTreeNode } from './EzAdvancedSearch';

/**
 * Aponta DS Advanced Search — espelha o `snk-pesquisa` do catálogo Sankhya DS.
 * Painel de busca avançada com campo de texto e múltiplos modos de exibição
 * de resultado (lista, grade e árvore hierárquica opcional). O carregamento
 * dos dados é feito inteiramente por funções assíncronas fornecidas por
 * quem usa o componente (`searchLoader`, `treeLoader`) — sem nenhuma
 * dependência de `PesquisaFetcher`/`DataUnit` do Sankhya.
 */
const meta: Meta<typeof EzAdvancedSearch> = {
  title: 'DS/EzAdvancedSearch',
  component: EzAdvancedSearch,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzAdvancedSearch>;

const MOCK_ORGANIZATIONS: SearchResultItem[] = [
  { id: 1, title: 'Social Tecnologia', subtitle: 'Cliente ativo — 12 contratos' },
  { id: 2, title: 'Acme Corporação', subtitle: 'Cliente ativo — 3 contratos' },
  { id: 3, title: 'Omega Serviços', subtitle: 'Cliente inativo desde 2024' },
  { id: 4, title: 'Delta Soluções Industriais', subtitle: 'Cliente ativo — 7 contratos' },
];

const MOCK_TREE: SearchTreeNode[] = [
  {
    id: 'raiz',
    label: 'Plano de Contas',
    children: [
      { id: 'ativo', label: 'Ativo Circulante' },
      {
        id: 'passivo',
        label: 'Passivo',
        children: [{ id: 'passivo-curto', label: 'Passivo Circulante' }],
      },
    ],
  },
];

const mockSearchLoader = (text: string): Promise<SearchResultItem[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const filtered = text
        ? MOCK_ORGANIZATIONS.filter((item) => item.title.toLowerCase().includes(text.toLowerCase()))
        : MOCK_ORGANIZATIONS;
      resolve(filtered);
    }, 400);
  });

const mockTreeLoader = (): Promise<SearchTreeNode[]> =>
  new Promise((resolve) => setTimeout(() => resolve(MOCK_TREE), 400));

export const ModoLista: Story = {
  render: function Demo() {
    const [selected, setSelected] = useState<string>('Nenhum item selecionado');
    return (
      <div className="flex flex-col gap-3 w-[520px]">
        <span className="text-[13px] text-gray-500">
          Selecionado: <strong>{selected}</strong>
        </span>
        <EzAdvancedSearch
          searchLoader={mockSearchLoader}
          onSelect={(item) => setSelected('title' in item ? String(item.title) : String(item.label))}
          viewMode="list"
        />
      </div>
    );
  },
};

export const ModoGrade: Story = {
  render: function Demo() {
    const [selected, setSelected] = useState<string>('Nenhum item selecionado');
    return (
      <div className="flex flex-col gap-3 w-[640px]">
        <span className="text-[13px] text-gray-500">
          Selecionado: <strong>{selected}</strong>
        </span>
        <EzAdvancedSearch
          searchLoader={mockSearchLoader}
          onSelect={(item) => setSelected('title' in item ? String(item.title) : String(item.label))}
          viewMode="grid"
        />
      </div>
    );
  },
};

export const ComArvoreHierarquica: Story = {
  render: function Demo() {
    const [selected, setSelected] = useState<string>('Nenhum item selecionado');
    return (
      <div className="flex flex-col gap-3 w-[520px]">
        <span className="text-[13px] text-gray-500">
          Selecionado: <strong>{selected}</strong>
        </span>
        <EzAdvancedSearch
          searchLoader={mockSearchLoader}
          treeLoader={mockTreeLoader}
          onSelect={(item) => setSelected('title' in item ? String(item.title) : String(item.label))}
        />
      </div>
    );
  },
};

export const Vazio: Story = {
  args: {
    searchLoader: () => Promise.resolve([]),
    onSelect: () => undefined,
  },
};
