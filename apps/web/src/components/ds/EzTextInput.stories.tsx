import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Mail, Search } from 'lucide-react';
import { EzTextInput } from './EzTextInput';

/**
 * Aponta DS Text Input (inspirado no @sankhyalabs/ezui)
 * Campo de texto de linha única usado em formulários de chamados, cadastro
 * de clientes/organizações e buscas dentro do helpdesk.
 */
const meta: Meta<typeof EzTextInput> = {
  title: 'DS/EzTextInput',
  component: EzTextInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTextInput>;

export const Default: Story = {
  args: {
    label: 'Assunto do chamado',
    placeholder: 'Ex: Falha no servidor de produção',
  },
};

export const ComIcones: Story = {
  args: {
    label: 'Buscar cliente',
    placeholder: 'Nome da organização...',
    leftIcon: <Search size={16} />,
  },
};

export const ComErro: Story = {
  args: {
    label: 'E-mail do cliente',
    leftIcon: <Mail size={16} />,
    hasError: true,
    message: 'Informe um e-mail válido para contato do chamado.',
  },
};

export const Senha: Story = {
  args: {
    label: 'Senha de acesso ao portal',
    type: 'password',
    required: true,
  },
};

export const TamanhoSlim: Story = {
  args: {
    label: 'Número do contrato',
    size: 'slim',
    placeholder: 'SLA-2024-0421',
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'ID do chamado',
    disabled: true,
    value: '#4821',
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('Cliente reportou lentidão no sistema');
      return (
        <EzTextInput
          label="Assunto do chamado"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          message="Visível na listagem de chamados do atendente."
        />
      );
    }
    return <Demo />;
  },
};
