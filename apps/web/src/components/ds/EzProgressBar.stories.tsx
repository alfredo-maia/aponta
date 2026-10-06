import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzProgressBar } from './EzProgressBar';

/**
 * Aponta DS Progress Bar — barra de progresso horizontal com valor clampado
 * entre 0 e 100, label percentual opcional e customização de altura/cor.
 * Usada para indicar avanço de SLA, preenchimento de checklist de chamados
 * ou progresso de importação de dados de clientes/organizações.
 */
const meta: Meta<typeof EzProgressBar> = {
  title: 'DS/EzProgressBar',
  component: EzProgressBar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzProgressBar>;

export const Default: Story = {
  args: {
    value: 50,
  },
};

export const ComLabel: Story = {
  args: {
    value: 72,
    showLabel: true,
  },
};

export const SlaCritico: Story = {
  args: {
    value: 90,
    showLabel: true,
    colorClass: 'bg-red-600',
  },
};

export const ChecklistCompleto: Story = {
  args: {
    value: 100,
    showLabel: true,
    colorClass: 'bg-green-600',
  },
};

export const BarraFina: Story = {
  args: {
    value: 35,
    showLabel: true,
    sizeClass: 'h-1',
  },
};

export const BarraEspessa: Story = {
  args: {
    value: 60,
    showLabel: true,
    sizeClass: 'h-4',
  },
};
