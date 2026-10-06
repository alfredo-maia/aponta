import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity, Ticket, AlertTriangle } from 'lucide-react';
import { EzTile } from './EzTile';

/**
 * Aponta DS Tile
 * Card pequeno de dados ideal para dashboards (ex.: "Total de Chamados: 12").
 * Suporta ícone opcional com variantes de cor, valor em destaque e descrição
 * auxiliar (ex.: variação percentual ou SLA).
 */
const meta: Meta<typeof EzTile> = {
  title: 'DS/EzTile',
  component: EzTile,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTile>;

export const Default: Story = {
  args: {
    label: 'Chamados abertos',
    value: 12,
  },
};

export const ComDescricao: Story = {
  args: {
    label: 'Chamados resolvidos no mês',
    value: 150,
    description: '+15% em relação ao mês anterior',
  },
};

export const ComIcone: Story = {
  args: {
    label: 'Total de chamados',
    value: 42,
    icon: <Ticket className="w-5 h-5" />,
  },
};

export const VarianteVerde: Story = {
  args: {
    label: 'SLA cumprido',
    value: '98%',
    description: 'Dentro da meta contratual',
    icon: <Activity className="w-5 h-5" />,
    iconVariant: 'green',
  },
};

export const VarianteVermelha: Story = {
  args: {
    label: 'Chamados em atraso',
    value: 3,
    description: 'SLA vencido',
    icon: <AlertTriangle className="w-5 h-5" />,
    iconVariant: 'red',
  },
};

export const VarianteCinza: Story = {
  args: {
    label: 'Contratos encerrados',
    value: 7,
    description: 'Vigência finalizada',
    iconVariant: 'gray',
  },
};

export const SemValor: Story = {
  args: {
    label: 'Aguardando primeira sincronização',
  },
};
