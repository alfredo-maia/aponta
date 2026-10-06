import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzAlert } from './EzAlert';

/**
 * Aponta DS Alert
 * Banner para mensagens de feedback contextual (sucesso, aviso, erro, info).
 * Suporta título opcional, ícone customizado, ação à direita e botão de
 * fechar (`onClose`). Usado para avisos de SLA, status de chamados e
 * confirmações de ações do operador.
 */
const meta: Meta<typeof EzAlert> = {
  title: 'DS/EzAlert',
  component: EzAlert,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzAlert>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Novo chamado atribuído',
    children: 'O chamado #4821 foi atribuído a você pela organização Social Tecnologia.',
  },
};

export const Sucesso: Story = {
  args: {
    variant: 'success',
    title: 'Chamado encerrado',
    children: 'O chamado #4790 foi encerrado com sucesso e o cliente foi notificado.',
  },
};

export const Aviso: Story = {
  args: {
    variant: 'warning',
    title: 'SLA próximo do vencimento',
    children: 'Restam 30 minutos para o vencimento do SLA do chamado #4821.',
  },
};

export const Erro: Story = {
  args: {
    variant: 'error',
    title: 'Falha ao salvar chamado',
    children: 'Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.',
  },
};

export const ComAcaoEFechar: Story = {
  args: {
    variant: 'warning',
    title: 'Chamado sem resposta há 2 dias',
    children: 'O cliente não respondeu à última interação. Deseja escalar para o supervisor?',
    action: (
      <button type="button" onClick={() => undefined}>
        Escalar chamado
      </button>
    ),
    onClose: () => undefined,
  },
};
