import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzButton } from './EzButton';
import { EzPopup } from './EzPopup';

/**
 * Aponta DS Popup — painel flutuante simples posicionado próximo a um
 * elemento trigger, SEM overlay escuro atrás (diferente do `EzModal`).
 * Fecha ao clicar fora.
 */
const meta: Meta<typeof EzPopup> = {
  title: 'DS/EzPopup',
  component: EzPopup,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPopup>;

export const Aberto: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Filtrar chamados" />,
    open: true,
    onClose: () => undefined,
    children: (
      <div className="flex flex-col gap-1 min-w-[180px] text-[14px] text-gray-700 font-medium">
        <span>Abertos hoje (12)</span>
        <span>Aguardando cliente (5)</span>
        <span>SLA em risco (2)</span>
      </div>
    ),
  },
};

export const PosicaoTopo: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Ações rápidas" />,
    open: true,
    onClose: () => undefined,
    position: 'top',
    children: (
      <div className="flex flex-col gap-1 min-w-[160px] text-[14px] text-gray-700 font-medium">
        <span>Assumir chamado</span>
        <span>Transferir fila</span>
      </div>
    ),
  },
};

export const PosicaoDireita: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Ver organização" />,
    open: true,
    onClose: () => undefined,
    position: 'right',
    children: (
      <div className="min-w-[200px] text-[14px] text-gray-700 font-medium">
        Refrigeração Mota — 12 contratos ativos.
      </div>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <EzPopup
          trigger={
            <EzButton
              variant="secondary"
              label="Filtrar chamados"
              onClick={() => setOpen((v) => !v)}
            />
          }
          open={open}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1 min-w-[180px] text-[14px] text-gray-700 font-medium">
            <span>Abertos hoje (12)</span>
            <span>Aguardando cliente (5)</span>
            <span>SLA em risco (2)</span>
          </div>
        </EzPopup>
      );
    }
    return <Demo />;
  },
};
