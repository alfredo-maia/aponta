import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzFilterBar, type FilterDef } from './EzFilterBar';

/**
 * Aponta DS Filter Bar — espelha o comportamento visual do `snk-filter-bar`
 * do catálogo Sankhya DS, SEM depender de `SnkApplication`/`DataUnit`.
 * Mostra filtros ativos como chips em uma barra rolável; clicar num chip
 * abre um popover de edição rápida (limpar / fixar / remover); o botão
 * "Filtros" abre um modal completo com todos os filtros agrupados por
 * categoria e um botão "Aplicar" para aplicar tudo de uma vez.
 */
const meta: Meta<typeof EzFilterBar> = {
  title: 'DS/EzFilterBar',
  component: EzFilterBar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzFilterBar>;

const baseFilters: FilterDef[] = [
  { id: 'status', label: 'Status', category: 'Chamado', value: 'Aberto', active: true, pinned: true },
  { id: 'prioridade', label: 'Prioridade', category: 'Chamado', value: 'Alta', active: true },
  { id: 'sla', label: 'SLA', category: 'Chamado', value: 'Dentro do prazo', active: false },
  { id: 'cliente', label: 'Cliente', category: 'Relacionamento', value: 'Social Tecnologia', active: true },
  { id: 'responsavel', label: 'Responsável', category: 'Relacionamento', value: '', active: false },
  { id: 'periodo', label: 'Período', category: 'Data', value: 'Últimos 30 dias', active: false },
];

export const Default: Story = {
  args: {
    filters: baseFilters,
    onFilterChange: () => undefined,
    onApplyAll: () => undefined,
  },
};

export const ComTitulo: Story = {
  args: {
    title: 'Filtros da listagem',
    filters: baseFilters,
    onFilterChange: () => undefined,
    onApplyAll: () => undefined,
  },
};

export const SemFiltrosAtivos: Story = {
  args: {
    filters: baseFilters.map((f) => ({ ...f, active: false })),
    onFilterChange: () => undefined,
    onApplyAll: () => undefined,
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [filters, setFilters] = useState<FilterDef[]>(baseFilters);

      const handleFilterChange = (updated: FilterDef) => {
        setFilters((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      };

      const handleApplyAll = (updated: FilterDef[]) => {
        setFilters(updated);
      };

      return (
        <EzFilterBar
          title="Chamados"
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyAll={handleApplyAll}
        />
      );
    }
    return <Demo />;
  },
};
