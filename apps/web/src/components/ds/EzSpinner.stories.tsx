import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSpinner } from './EzSpinner';

/**
 * Aponta DS Spinner
 * Indica um estado de carregamento ou processo em andamento. Usado em telas
 * de chamados, listas de clientes e ações assíncronas (salvar, carregar mais).
 */
const meta: Meta<typeof EzSpinner> = {
  title: 'DS/EzSpinner',
  component: EzSpinner,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSpinner>;

export const Default: Story = {
  args: {},
};

export const ComLabel: Story = {
  args: {
    label: 'Carregando chamados...',
  },
};

export const Pequeno: Story = {
  args: {
    size: 16,
    label: 'Atualizando SLA...',
  },
};

export const Grande: Story = {
  args: {
    size: 48,
    label: 'Sincronizando organização...',
  },
};

export const CorPersonalizada: Story = {
  args: {
    size: 32,
    colorClass: 'text-red-500',
    label: 'Encerrando chamado...',
  },
};
