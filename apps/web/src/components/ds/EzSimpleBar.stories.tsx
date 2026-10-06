import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSimpleBar } from './EzSimpleBar';

/**
 * Aponta DS Simple Bar — espelha o `snk-simple-bar` do catálogo Sankhya DS.
 * Cabeçalho visual padronizado com título, subtítulo/breadcrumb opcional,
 * botão de voltar opcional (via `onBack`) e um slot de conteúdo/ações à
 * direita (via `actions` ou `children`). Não possui botões de ação/CRUD —
 * para esses casos, prefira `EzTaskbar`.
 */
const meta: Meta<typeof EzSimpleBar> = {
  title: 'DS/EzSimpleBar',
  component: EzSimpleBar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSimpleBar>;

export const Default: Story = {
  args: {
    title: 'Título do header',
  },
};

export const ComSubtitulo: Story = {
  args: {
    title: 'Relatórios de Vendas',
    subtitle: 'Visão consolidada do mês atual',
  },
};

export const ComBotaoVoltar: Story = {
  args: {
    title: 'Detalhe do chamado #4821',
    onBack: () => undefined,
  },
};

export const ComBreadcrumb: Story = {
  args: {
    title: 'Vendas',
    breadcrumbItems: [
      { id: 1, label: 'Tela principal' },
      { id: 2, label: 'Tela intermediária' },
      { id: 3, label: 'Tela atual' },
    ],
    onBreadcrumbItemClick: () => undefined,
  },
};

export const ComAcoesPersonalizadas: Story = {
  args: {
    title: 'Clientes',
    subtitle: '128 registros encontrados',
    actions: (
      <button type="button" className="text-sm text-brand-600 font-medium">
        Filtrar
      </button>
    ),
  },
};

export const Completo: Story = {
  args: {
    title: 'Chamado #4821',
    subtitle: 'Aguardando retorno do cliente há 2 dias',
    breadcrumbItems: [
      { id: 1, label: 'Chamados' },
      { id: 2, label: 'Chamado #4821' },
    ],
    onBreadcrumbItemClick: () => undefined,
    onBack: () => undefined,
    actions: (
      <button type="button" className="text-sm text-brand-600 font-medium">
        Exportar
      </button>
    ),
  },
};

export const Fixo: Story = {
  args: {
    title: 'Título fixo no topo',
    sticky: true,
  },
};
