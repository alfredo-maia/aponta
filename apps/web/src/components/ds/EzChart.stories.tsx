import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzChart } from './EzChart';

/**
 * Aponta DS Chart — gráfico de barras mínimo (vertical ou horizontal)
 * montado só com divs proporcionais, sem biblioteca externa de charts.
 */
const meta: Meta<typeof EzChart> = {
  title: 'DS/EzChart',
  component: EzChart,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzChart>;

const chamadosPorDia = [
  { label: 'Seg', value: 12 },
  { label: 'Ter', value: 19 },
  { label: 'Qua', value: 8 },
  { label: 'Qui', value: 15 },
  { label: 'Sex', value: 22 },
];

export const Default: Story = {
  args: {
    data: chamadosPorDia,
  },
};

export const Horizontal: Story = {
  args: {
    variant: 'horizontal-bar',
    data: [
      { label: 'Abertos', value: 34 },
      { label: 'Em atendimento', value: 21 },
      { label: 'Aguardando', value: 12 },
      { label: 'Resolvidos', value: 58 },
    ],
  },
};

export const CorVerde: Story = {
  args: {
    data: chamadosPorDia,
    barColorClass: 'bg-green-600',
  },
};

export const CorPetroleo: Story = {
  args: {
    variant: 'horizontal-bar',
    barColorClass: 'bg-petroleum-600',
    data: [
      { label: 'Hardware', value: 18 },
      { label: 'Software', value: 27 },
      { label: 'Rede', value: 9 },
      { label: 'Acesso', value: 14 },
    ],
  },
};
