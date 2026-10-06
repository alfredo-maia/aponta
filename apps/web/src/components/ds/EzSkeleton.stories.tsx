import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSkeleton } from './EzSkeleton';

/**
 * Aponta DS Skeleton
 * Placeholder animado (`animate-pulse`) exibido enquanto o conteúdo real
 * ainda está carregando — por exemplo a lista de chamados, o card de um
 * cliente ou a imagem de avatar de um atendente, antes da resposta da API
 * chegar. Possui três variantes de forma: `text`, `circular` e
 * `rectangular`.
 */
const meta: Meta<typeof EzSkeleton> = {
  title: 'DS/EzSkeleton',
  component: EzSkeleton,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSkeleton>;

export const Texto: Story = {
  args: {
    variant: 'text',
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
  },
};

export const TamanhoPersonalizado: Story = {
  args: {
    variant: 'rectangular',
    width: 240,
    height: 80,
  },
};

/**
 * Combinação de skeletons simulando o carregamento de um card de chamado:
 * avatar do cliente (circular), título (texto) e descrição (texto mais
 * curto), enquanto a resposta da API de chamados não chegou.
 */
export const CardDeChamadoCarregando: Story = {
  render: () => (
    <div className="flex items-start gap-3 w-[320px] p-4 border border-gray-200 rounded-[12px]">
      <EzSkeleton variant="circular" />
      <div className="flex flex-col flex-1 gap-2">
        <EzSkeleton variant="text" width="70%" />
        <EzSkeleton variant="text" width="90%" />
        <EzSkeleton variant="text" width="40%" />
      </div>
    </div>
  ),
};
