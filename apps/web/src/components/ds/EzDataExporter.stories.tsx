import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzDataExporter } from './EzDataExporter';

/**
 * Aponta DS Data Exporter — espelha o comportamento visual do `snk-data-exporter`
 * do catálogo Sankhya DS: modal para escolher formato (CSV/Excel/PDF) e escopo
 * (selecionados / página atual / todos os registros), com confirmação, estado
 * de carregamento e feedback de sucesso/erro. A implementação real da
 * exportação (DataUnit/provider) fica a cargo da aplicação host via `onExport`.
 */
const meta: Meta<typeof EzDataExporter> = {
  title: 'DS/EzDataExporter',
  component: EzDataExporter,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDataExporter>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    onExport: () => undefined,
  },
};

export const ComContagens: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    onExport: () => undefined,
    formats: ['csv', 'xlsx', 'pdf'],
    scopes: [
      { value: 'selected', label: 'Selecionados' },
      { value: 'page', label: 'Página atual' },
      { value: 'all', label: 'Todos os registros' },
    ],
    selectedCount: 5,
    totalCount: 248,
  },
};

export const SomenteDoisFormatos: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    onExport: () => undefined,
    formats: ['csv', 'pdf'],
    scopes: [
      { value: 'page', label: 'Página atual' },
      { value: 'all', label: 'Todos os registros' },
    ],
  },
};

export const ExportacaoDemorada: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    onExport: () => new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    formats: ['xlsx'],
    scopes: [{ value: 'all', label: 'Todos os registros' }],
  },
};
