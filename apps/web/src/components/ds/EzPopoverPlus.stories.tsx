import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzButton } from './EzButton';
import { EzPopoverPlus } from './EzPopoverPlus';

/**
 * Aponta DS Popover Plus — variante mais rica do `EzPopover`, com cabeçalho
 * explícito (título + botão fechar) em vez de depender só do clique fora.
 * Estado de abertura controlado externamente via `open`/`onClose`.
 */
const meta: Meta<typeof EzPopoverPlus> = {
  title: 'DS/EzPopoverPlus',
  component: EzPopoverPlus,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPopoverPlus>;

export const Aberto: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Detalhes do cliente" />,
    title: 'Social Tecnologia',
    open: true,
    onClose: () => undefined,
    children:
      'Cliente desde 2021. 12 contratos ativos, faturamento quarteirizado habilitado e SLA de 4h para chamados críticos.',
  },
};

export const AlinhadoDireita: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Ver SLA" />,
    title: 'SLA contratual',
    open: true,
    onClose: () => undefined,
    align: 'right',
    children: 'Resposta em até 4h para chamados críticos e 8h para os demais.',
  },
};

export const PosicaoTopo: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Status do chamado" />,
    title: 'Chamado #4821',
    open: true,
    onClose: () => undefined,
    position: 'top',
    children: 'Aguardando retorno do cliente há 2 dias. Última interação em 04/10/2026.',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <EzPopoverPlus
          trigger={
            <EzButton
              variant="secondary"
              label="Detalhes do cliente"
              onClick={() => setOpen((v) => !v)}
            />
          }
          title="Social Tecnologia"
          open={open}
          onClose={() => setOpen(false)}
        >
          Cliente desde 2021. 12 contratos ativos, faturamento quarteirizado habilitado
          e SLA de 4h para chamados críticos.
        </EzPopoverPlus>
      );
    }
    return <Demo />;
  },
};
