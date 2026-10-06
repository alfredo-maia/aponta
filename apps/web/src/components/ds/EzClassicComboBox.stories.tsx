import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzClassicComboBox } from './EzClassicComboBox';

/**
 * Aponta DS Classic Combo Box — select nativo com o visual "classic"
 * Sankhya: cantos quadrados e layout denso, usado em telas legadas de
 * cadastro e filtros de chamados.
 */
const meta: Meta<typeof EzClassicComboBox> = {
  title: 'DS/EzClassicComboBox',
  component: EzClassicComboBox,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzClassicComboBox>;

const statusOptions = [
  { label: 'Aberto', value: 'aberto' },
  { label: 'Em atendimento', value: 'atendimento' },
  { label: 'Aguardando cliente', value: 'aguardando' },
  { label: 'Resolvido', value: 'resolvido' },
  { label: 'Cancelado', value: 'cancelado', disabled: true },
];

export const Default: Story = {
  args: {
    id: 'combo-status',
    label: 'Status do chamado',
    options: statusOptions,
  },
};

export const Obrigatorio: Story = {
  args: {
    id: 'combo-prioridade',
    label: 'Prioridade',
    required: true,
    options: [
      { label: 'Baixa', value: 'baixa' },
      { label: 'Média', value: 'media' },
      { label: 'Alta', value: 'alta' },
      { label: 'Crítica', value: 'critica' },
    ],
    message: 'Campo obrigatório para abertura do chamado.',
  },
};

export const ComErro: Story = {
  args: {
    id: 'combo-contrato',
    label: 'Contrato vinculado',
    hasError: true,
    message: 'Selecione um contrato ativo para faturar.',
    options: [
      { label: 'Selecione...', value: '' },
      { label: 'Contrato #112 — Suporte mensal', value: '112' },
      { label: 'Contrato #98 — Locação de impressoras', value: '98' },
    ],
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'combo-filial',
    label: 'Filial',
    disabled: true,
    options: [{ label: 'Matriz — São Paulo', value: 'sp' }],
    message: 'Filial definida pelo contrato do cliente.',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [status, setStatus] = useState('aberto');
      return (
        <div className="flex flex-col gap-2">
          <EzClassicComboBox
            id="combo-interactive"
            label="Status do chamado"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <p className="text-[13px] text-gray-700">Status selecionado: {status}</p>
        </div>
      );
    }
    return <Demo />;
  },
};
