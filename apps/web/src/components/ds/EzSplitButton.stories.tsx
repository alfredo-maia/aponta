import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSplitButton } from './EzSplitButton';

/**
 * Aponta DS Split Button — botão de ação principal colado a um chevron que
 * abre um dropdown de ações secundárias. Usado no rodapé do formulário de
 * chamado ("Salvar" + variações).
 */
const meta: Meta<typeof EzSplitButton> = {
  title: 'DS/EzSplitButton',
  component: EzSplitButton,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSplitButton>;

export const Default: Story = {
  args: {
    label: 'Salvar chamado',
    onClick: () => undefined,
    actions: [
      { label: 'Salvar e fechar', onClick: () => undefined },
      { label: 'Salvar e criar novo', onClick: () => undefined },
      { label: 'Salvar como modelo', onClick: () => undefined },
    ],
  },
};

export const UmaAcaoSecundaria: Story = {
  args: {
    label: 'Assumir chamado',
    onClick: () => undefined,
    actions: [{ label: 'Assumir e notificar cliente', onClick: () => undefined }],
  },
};

export const Disabled: Story = {
  args: {
    label: 'Faturar contrato',
    onClick: () => undefined,
    disabled: true,
    actions: [
      { label: 'Faturar e enviar por e-mail', onClick: () => undefined },
      { label: 'Faturamento quarteirizado', onClick: () => undefined },
    ],
  },
};
