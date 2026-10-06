import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Calendar, Search, User } from 'lucide-react';
import { EzClassicInput } from './EzClassicInput';

/**
 * Aponta DS Classic Input — input de texto denso com cantos quadrados no
 * padrão "classic" Sankhya, com label, ícones laterais e mensagem de
 * ajuda/erro.
 */
const meta: Meta<typeof EzClassicInput> = {
  title: 'DS/EzClassicInput',
  component: EzClassicInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzClassicInput>;

export const Default: Story = {
  args: {
    id: 'input-default',
    label: 'Nome do cliente',
    placeholder: 'Ex.: Social Tecnologia',
  },
};

export const ComIcones: Story = {
  args: {
    id: 'input-icons',
    label: 'Buscar chamado',
    placeholder: 'Número, cliente ou assunto...',
    leftIcon: <Search className="w-4 h-4" />,
    rightIcon: <User className="w-4 h-4" />,
  },
};

export const ObrigatorioComAjuda: Story = {
  args: {
    id: 'input-email',
    label: 'E-mail do contato',
    type: 'email',
    required: true,
    placeholder: 'contato@empresa.com.br',
    message: 'Usado para notificações de abertura e fechamento de chamados.',
    rightIcon: <Calendar className="w-4 h-4" />,
  },
};

export const ComErro: Story = {
  args: {
    id: 'input-cnpj',
    label: 'CNPJ',
    hasError: true,
    defaultValue: '12.345.678/0001',
    message: 'CNPJ inválido. Confira os dígitos verificadores.',
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'input-codigo',
    label: 'Código do cliente',
    disabled: true,
    defaultValue: 'CLI-00482',
    message: 'Gerado automaticamente pelo ERP.',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      return (
        <div className="flex flex-col gap-2">
          <EzClassicInput
            id="input-interactive"
            label="Assunto do chamado"
            placeholder="Descreva o problema em uma linha"
            leftIcon={<Search className="w-4 h-4" />}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            message={`${value.length}/80 caracteres`}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
