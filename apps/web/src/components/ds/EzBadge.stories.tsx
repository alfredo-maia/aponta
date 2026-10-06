import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzBadge } from './EzBadge';

/**
 * Aponta DS Badge
 * Indicador numérico ou de status, geralmente um círculo ou retângulo
 * arredondado. Suporta 4 tamanhos (`x-small` a `large`) e cores
 * customizadas via `colorClass`. Usado para contagem de chamados
 * pendentes, notificações e indicadores de prioridade/SLA.
 */
const meta: Meta<typeof EzBadge> = {
  title: 'DS/EzBadge',
  component: EzBadge,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzBadge>;

export const Padrao: Story = {
  args: {
    children: '3',
  },
};

export const ContadorDeChamados: Story = {
  args: {
    size: 'large',
    colorClass: 'bg-red-500 text-white',
    children: '12',
  },
};

export const SlaEmDia: Story = {
  args: {
    size: 'small',
    colorClass: 'bg-green-500 text-white',
    children: 'OK',
  },
};

export const SlaVencendo: Story = {
  args: {
    size: 'medium',
    colorClass: 'bg-yellow-500 text-gray-900',
    children: '!',
  },
};

export const Minimo: Story = {
  args: {
    size: 'x-small',
    colorClass: 'bg-ocean-500 text-white',
    children: '',
  },
};
