import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzTooltip } from './EzTooltip';
import { EzButton } from './EzButton';

/**
 * Aponta DS Tooltip
 * Balão leve, apenas CSS (hover via `group-hover`), para dar contexto a
 * elementos com texto truncado ou ícones sem rótulo visível, como ações
 * rápidas na tabela de chamados. Envolve o elemento gatilho (`children`).
 */
const meta: Meta<typeof EzTooltip> = {
  title: 'DS/EzTooltip',
  component: EzTooltip,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTooltip>;

export const Default: Story = {
  args: {
    content: 'Ver detalhes do chamado',
    children: <EzButton>Chamado #4821</EzButton>,
  },
};

export const PosicaoInferior: Story = {
  args: {
    content: 'Cliente: Social Tecnologia',
    position: 'bottom',
    children: <EzButton variant="secondary">Organização</EzButton>,
  },
};

export const PosicaoEsquerda: Story = {
  args: {
    content: 'SLA vence em 4h',
    position: 'left',
    children: <EzButton variant="secondary">SLA</EzButton>,
  },
};

export const PosicaoDireita: Story = {
  args: {
    content: 'Atribuído a Maria Silva',
    position: 'right',
    children: <EzButton variant="secondary">Responsável</EzButton>,
  },
};

export const ComDelayMaior: Story = {
  args: {
    content: 'Exibido após 800ms de hover',
    delay: 800,
    children: <EzButton variant="tertiary">Passe o mouse aqui</EzButton>,
  },
};
