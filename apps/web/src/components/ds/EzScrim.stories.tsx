import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzButton } from './EzButton';
import { EzScrim } from './EzScrim';

/**
 * Aponta DS Scrim — camada overlay escura semitransparente, normalmente
 * renderizada atrás de modais e drawers (ex.: `EzModal`, `EzModalContainer`).
 * O clique no scrim geralmente dispara o dismiss do modal/drawer.
 */
const meta: Meta<typeof EzScrim> = {
  title: 'DS/EzScrim',
  component: EzScrim,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzScrim>;

export const Visivel: Story = {
  args: {
    visible: true,
    onClick: () => undefined,
  },
};

export const Oculto: Story = {
  args: {
    visible: false,
    onClick: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [visible, setVisible] = useState(false);
      return (
        <div className="flex flex-col items-start gap-3">
          <EzButton label="Abrir confirmação" onClick={() => setVisible(true)} />
          <EzScrim visible={visible} onClick={() => setVisible(false)} />
          {visible && (
            <div className="fixed left-1/2 top-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
              <p className="text-[16px] font-semibold text-gray-900">
                Encerrar chamado #4830?
              </p>
              <p className="mt-2 text-[14px] text-gray-700 font-medium">
                O cliente será notificado por e-mail. Clique fora para cancelar.
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <EzButton
                  variant="tertiary"
                  label="Cancelar"
                  onClick={() => setVisible(false)}
                />
                <EzButton label="Encerrar" onClick={() => setVisible(false)} />
              </div>
            </div>
          )}
        </div>
      );
    }
    return <Demo />;
  },
};
