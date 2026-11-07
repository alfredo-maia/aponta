import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSlaChip } from './EzSlaChip';

const now = new Date('2026-01-10T12:00:00.000Z');
const inMs = (ms: number) => new Date(now.getTime() + ms).toISOString();
const H = 3600000;

/**
 * Chip compacto de prazo (SLA): ícone + tempo restante (negativo = vencido), cor
 * semântica do DS e o texto completo no nome acessível e no tooltip. Usado no
 * cartão do Kanban.
 */
const meta: Meta<typeof EzSlaChip> = {
  title: 'DS/EzSlaChip',
  component: EzSlaChip,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSlaChip>;

export const DentroDoPrazo: Story = {
  args: { kind: 'response', status: 'ON_TRACK', deadline: inMs(17 * H + 18 * 60000), now },
};

export const EmRisco: Story = {
  args: { kind: 'resolve', status: 'AT_RISK', deadline: inMs(45 * 60000), now },
};

export const Vencido: Story = {
  args: { kind: 'resolve', status: 'BREACHED', deadline: inMs(-3 * 24 * H), now },
};

export const SemPrazoConhecido: Story = {
  args: { kind: 'response', status: 'ON_TRACK', now },
};

export const NoCartao: Story = {
  render: () => (
    <div className="flex gap-1">
      <EzSlaChip kind="response" status="ON_TRACK" deadline={inMs(5 * H)} now={now} />
      <EzSlaChip kind="resolve" status="BREACHED" deadline={inMs(-2 * H)} now={now} />
    </div>
  ),
};
