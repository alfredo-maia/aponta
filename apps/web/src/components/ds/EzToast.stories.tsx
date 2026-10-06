import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzToast } from './EzToast';

/**
 * Aponta DS Toast
 * Notificação transitória exibida sobre a interface (ex.: confirmação de
 * abertura de chamado, erro de salvamento). Use dentro de um Toast Provider
 * (react-hot-toast ou portal customizado). As variantes `success`, `warning`,
 * `error` e `info` controlam o ícone e a cor de destaque.
 */
const meta: Meta<typeof EzToast> = {
  title: 'DS/EzToast',
  component: EzToast,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzToast>;

export const Info: Story = {
  args: {
    title: 'Chamado #4821 atualizado',
    description: 'O status foi alterado para "Em atendimento".',
  },
};

export const Sucesso: Story = {
  args: {
    variant: 'success',
    title: 'Chamado encerrado com sucesso',
    description: 'O cliente foi notificado por e-mail.',
    onClose: () => undefined,
  },
};

export const Aviso: Story = {
  args: {
    variant: 'warning',
    title: 'SLA próximo do vencimento',
    description: 'Restam 2 horas para o prazo contratual deste chamado.',
    onClose: () => undefined,
  },
};

export const Erro: Story = {
  args: {
    variant: 'error',
    title: 'Falha ao salvar anexo',
    description: 'Não foi possível enviar o arquivo. Tente novamente.',
    onClose: () => undefined,
  },
};

export const SemBotaoDeFechar: Story = {
  args: {
    variant: 'info',
    title: 'Sincronizando dados da organização...',
  },
};

export const Saindo: Story = {
  args: {
    variant: 'success',
    title: 'Chamado criado',
    description: 'Será removido da tela em instantes.',
    visible: false,
    onClose: () => undefined,
  },
};
