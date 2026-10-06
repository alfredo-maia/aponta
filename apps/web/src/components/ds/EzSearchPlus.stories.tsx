import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzSearchPlus } from './EzSearchPlus';

/**
 * Aponta DS Search Plus — campo de busca com botão "Filtros" que revela um
 * painel de filtros avançados embutido. Usado na listagem de chamados para
 * combinar busca textual com filtros de status, prioridade e período.
 */
const meta: Meta<typeof EzSearchPlus> = {
  title: 'DS/EzSearchPlus',
  component: EzSearchPlus,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSearchPlus>;

export const Default: Story = {
  args: {
    id: 'search-plus-default',
    value: '',
    onChange: () => undefined,
    onToggleFilters: () => undefined,
    placeholder: 'Buscar chamados...',
  },
};

export const ComLabel: Story = {
  args: {
    id: 'search-plus-label',
    label: 'Buscar na base de conhecimento',
    value: '',
    onChange: () => undefined,
    onToggleFilters: () => undefined,
    placeholder: 'Digite um termo de pesquisa...',
  },
};

export const FiltrosAtivos: Story = {
  args: {
    id: 'search-plus-filtros',
    label: 'Buscar chamados',
    value: 'impressora',
    onChange: () => undefined,
    onToggleFilters: () => undefined,
    filtersActive: true,
    filtersPanel: (
      <div className="flex flex-col gap-2 text-[14px] text-gray-700">
        <span className="font-medium text-gray-900">Filtros aplicados</span>
        <span>Status: Aberto, Em atendimento</span>
        <span>Prioridade: Alta</span>
        <span>Período: últimos 30 dias</span>
      </div>
    ),
  },
};

export const Disabled: Story = {
  args: {
    id: 'search-plus-disabled',
    label: 'Buscar chamados',
    value: '',
    onChange: () => undefined,
    onToggleFilters: () => undefined,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      const [filtersOpen, setFiltersOpen] = useState(false);
      return (
        <EzSearchPlus
          id="search-plus-interactive"
          label="Buscar chamados"
          value={value}
          onChange={setValue}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          filtersActive={filtersOpen}
          placeholder="Número, assunto ou cliente..."
          filtersPanel={
            <div className="flex flex-col gap-2 text-[14px] text-gray-700">
              <span className="font-medium text-gray-900">Filtros avançados</span>
              <span>Refine por status, prioridade, equipe responsável e período de abertura.</span>
            </div>
          }
        />
      );
    }
    return <Demo />;
  },
};
