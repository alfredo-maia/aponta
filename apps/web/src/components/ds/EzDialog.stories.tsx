import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzDialog } from './EzDialog';
import { EzButton } from './EzButton';

/**
 * Aponta DS Dialog — confirmação modal em portal (info/danger/warning) com
 * ações Confirmar/Cancelar. Usado em exclusão de chamados, cancelamento de
 * contratos e outras ações destrutivas do helpdesk.
 */
const meta: Meta<typeof EzDialog> = {
  title: 'DS/EzDialog',
  component: EzDialog,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDialog>;

export const Default: Story = {
  args: {
    open: true,
    variant: 'info',
    title: 'Reabrir chamado',
    message: 'Deseja reabrir o chamado #4821? O cliente será notificado por e-mail.',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
};

export const Danger: Story = {
  args: {
    open: true,
    variant: 'danger',
    title: 'Excluir chamado',
    message: 'Esta ação é irreversível. Todos os anexos e o histórico de interações do chamado #4821 serão removidos.',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
};

export const Warning: Story = {
  args: {
    open: true,
    variant: 'warning',
    title: 'SLA prestes a estourar',
    message: 'O chamado #4830 vence em 15 minutos. Deseja escalonar para o nível 2 de suporte?',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <EzButton variant="primary" label="Cancelar contrato" onClick={() => setOpen(true)} />
          <EzDialog
            open={open}
            variant="danger"
            title="Cancelar contrato"
            message="O contrato de manutenção da Social Tecnologia será encerrado ao fim da vigência. Confirmar?"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
