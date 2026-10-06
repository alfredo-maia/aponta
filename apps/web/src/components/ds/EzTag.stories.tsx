import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Clock, X } from 'lucide-react';
import { EzTag } from './EzTag';

/**
 * Aponta DS Tag (Chip)
 * Elemento em formato de pílula para status, categorias ou filtros. Usado em
 * listas de chamados (status, prioridade) e em cards de clientes/organizações
 * (plano, SLA, segmento).
 */
const meta: Meta<typeof EzTag> = {
  title: 'DS/EzTag',
  component: EzTag,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTag>;

export const Default: Story = {
  args: {
    label: 'Aberto',
  },
};

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <EzTag label="Ocean" variant="ocean" />
      <EzTag label="Cinza" variant="gray" />
      <EzTag label="Resolvido" variant="green" />
      <EzTag label="SLA em risco" variant="yellow" />
      <EzTag label="Urgente" variant="red" />
      <EzTag label="Suporte" variant="petroleum" />
      <EzTag label="Arquivado" variant="outline" />
    </div>
  ),
};

export const ComIconeEsquerdo: Story = {
  args: {
    label: 'SLA dentro do prazo',
    variant: 'green',
    leftIcon: <Clock size={12} />,
  },
};

export const Removivel: Story = {
  args: {
    label: 'Cliente VIP',
    variant: 'ocean',
    rightIcon: <X size={12} />,
  },
};

export const StatusChamado: Story = {
  args: {
    label: 'Resolvido',
    variant: 'green',
    leftIcon: <Check size={12} />,
  },
};
