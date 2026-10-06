import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Trash2 } from 'lucide-react';
import { EzButton } from './EzButton';

/**
 * Aponta DS Button — inspirado no @sankhyalabs/ezui, reimplementado em
 * React + Tailwind (sem dependência do pacote original).
 */
const meta: Meta<typeof EzButton> = {
  title: 'DS/EzButton',
  component: EzButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary'] },
    size: { control: 'select', options: ['x-small', 'small', 'medium', 'large'] },
  },
};
export default meta;

type Story = StoryObj<typeof EzButton>;

export const Primary: Story = {
  args: { label: 'Cadastrar', variant: 'primary' },
};

export const Secondary: Story = {
  args: { label: 'Buscar CNPJ', variant: 'secondary', leftIcon: Plus },
};

export const Tertiary: Story = {
  args: { label: 'Remover', variant: 'tertiary', leftIcon: Trash2 },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <EzButton label="x-small" size="x-small" />
      <EzButton label="small" size="small" />
      <EzButton label="medium" size="medium" />
      <EzButton label="large" size="large" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { label: 'Indisponível', disabled: true },
};
