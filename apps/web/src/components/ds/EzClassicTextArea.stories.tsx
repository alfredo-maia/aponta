import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzClassicTextArea } from './EzClassicTextArea';

/**
 * Aponta DS Classic Text Area — textarea densa com cantos quadrados no
 * padrão "classic" Sankhya, usada na descrição de chamados e observações
 * de contratos.
 */
const meta: Meta<typeof EzClassicTextArea> = {
  title: 'DS/EzClassicTextArea',
  component: EzClassicTextArea,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzClassicTextArea>;

export const Default: Story = {
  args: {
    id: 'textarea-default',
    label: 'Descrição do chamado',
    placeholder: 'Descreva o problema relatado pelo cliente...',
  },
};

export const Obrigatorio: Story = {
  args: {
    id: 'textarea-obs',
    label: 'Observações da visita técnica',
    required: true,
    placeholder: 'Registre o que foi verificado em campo...',
    message: 'Obrigatório para chamados com deslocamento.',
  },
};

export const ComErro: Story = {
  args: {
    id: 'textarea-motivo',
    label: 'Motivo do cancelamento',
    hasError: true,
    defaultValue: 'Cliente',
    message: 'Descreva o motivo com pelo menos 20 caracteres.',
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'textarea-historico',
    label: 'Histórico de atendimento',
    disabled: true,
    defaultValue: '10/09 — Chamado aberto pela recepção.\n11/09 — Técnico designado: Carlos Almeida.',
    message: 'Campo somente leitura, alimentado pelo sistema.',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      return (
        <EzClassicTextArea
          id="textarea-interactive"
          label="Solução aplicada"
          placeholder="Descreva a solução aplicada ao chamado..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          message={`${value.length}/500 caracteres`}
        />
      );
    }
    return <Demo />;
  },
};
