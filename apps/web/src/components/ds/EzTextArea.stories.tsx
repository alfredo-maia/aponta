import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTextArea } from './EzTextArea';

/**
 * Aponta DS Text Area
 * Campo de texto multilinha para descrições de chamados, observações
 * internas e comentários de atendimento ao cliente.
 */
const meta: Meta<typeof EzTextArea> = {
  title: 'DS/EzTextArea',
  component: EzTextArea,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTextArea>;

export const Default: Story = {
  args: {
    placeholder: 'Descreva o problema relatado pelo cliente...',
  },
};

export const ComLabel: Story = {
  args: {
    label: 'Descrição do chamado',
    placeholder: 'Detalhe o ocorrido para a equipe de suporte...',
    required: true,
  },
};

export const ComErro: Story = {
  args: {
    label: 'Observações internas',
    hasError: true,
    message: 'Campo obrigatório para chamados com SLA crítico.',
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'Resolução do chamado',
    disabled: true,
    value: 'Chamado encerrado automaticamente pelo encerramento do contrato.',
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(
        'Cliente relatou indisponibilidade do sistema desde 09h00.'
      );
      return (
        <EzTextArea
          label="Descrição do chamado"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
          message="Visível para o cliente e para a equipe de suporte."
        />
      );
    }
    return <Demo />;
  },
};
