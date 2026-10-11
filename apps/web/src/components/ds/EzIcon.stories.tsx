import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzIcon } from './EzIcon';
import { Check, AlertCircle, Search, Settings, Bell } from 'lucide-react';

/**
 * Aponta DS Icon
 * Padroniza o container e alinhamento de ícones SVG / Lucide no Design System.
 * Suporta tamanhos pré-definidos (small, medium, large, x-large) e colorClass.
 */
const meta: Meta<typeof EzIcon> = {
  title: 'DS/EzIcon',
  component: EzIcon,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzIcon>;

export const Padrao: Story = {
  args: {
    icon: <Search className="w-full h-full" />,
    size: 'medium',
  },
};

export const Pequeno: Story = {
  args: {
    icon: <Check className="w-full h-full" />,
    size: 'small',
    colorClass: 'text-green-600',
  },
};

export const GrandeComAlerta: Story = {
  args: {
    icon: <AlertCircle className="w-full h-full" />,
    size: 'large',
    colorClass: 'text-amber-500',
  },
};

export const ExtraGrande: Story = {
  args: {
    icon: <Bell className="w-full h-full" />,
    size: 'x-large',
    colorClass: 'text-ocean-600',
  },
};

export const Customizado: Story = {
  args: {
    icon: <Settings className="w-full h-full" />,
    size: 'medium',
    colorClass: 'text-gray-500 hover:text-ocean-600',
  },
};
