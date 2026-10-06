import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzAlertList } from './EzAlertList';

/**
 * Aponta DS Alert List — pilha vertical de banners de alerta/notificação
 * (sucesso, aviso, erro, info), com botão de fechar opcional por item.
 */
const meta: Meta<typeof EzAlertList> = {
  title: 'DS/EzAlertList',
  component: EzAlertList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzAlertList>;

export const Default: Story = {
  args: {
    items: [
      { id: 1, variant: 'success', message: 'Chamado #4821 resolvido e fechado com sucesso.' },
      { id: 2, variant: 'warning', message: 'SLA do chamado #4830 vence em 30 minutos.' },
      { id: 3, variant: 'error', message: 'Falha ao sincronizar contrato com o ERP. Tente novamente.' },
      { id: 4, variant: 'info', message: 'Novo técnico disponível para atendimento na região Sul.' },
    ],
  },
};

export const ComDismiss: Story = {
  args: {
    items: [
      { id: 1, variant: 'success', message: 'Faturamento do contrato #112 gerado com sucesso.' },
      { id: 2, variant: 'warning', message: 'Contrato #98 entra em renovação automática em 7 dias.' },
      { id: 3, variant: 'error', message: 'Cliente sem contato principal cadastrado.' },
    ],
    onDismiss: () => undefined,
  },
};

export const ApenasErros: Story = {
  args: {
    items: [
      { id: 1, variant: 'error', message: 'Falha na integração com o servidor de e-mail.' },
      { id: 2, variant: 'error', message: 'Não foi possível carregar os anexos do chamado #4799.' },
    ],
    onDismiss: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [items, setItems] = useState([
        { id: 1, variant: 'success' as const, message: 'Backup diário concluído às 03h00.' },
        { id: 2, variant: 'warning' as const, message: 'SLA do chamado #4830 vence em 30 minutos.' },
        { id: 3, variant: 'error' as const, message: 'Falha ao emitir nota fiscal do faturamento #77.' },
        { id: 4, variant: 'info' as const, message: 'Manutenção programada para domingo, 02h às 04h.' },
      ]);
      return (
        <EzAlertList
          items={items}
          onDismiss={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
        />
      );
    }
    return <Demo />;
  },
};
