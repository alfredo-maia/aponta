import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzDateInput } from './EzDateInput';

/**
 * Aponta DS Date Input — envolve o `<input type="date">` nativo com a
 * estilização do DS, ícone de calendário clicável (abre o seletor nativo
 * via `showPicker`) e estados de erro/desabilitado. Usado para datas de
 * abertura de chamado, vigência de contrato e prazos de SLA.
 */
const meta: Meta<typeof EzDateInput> = {
  title: 'DS/EzDateInput',
  component: EzDateInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDateInput>;

export const Default: Story = {
  args: {
    id: 'date-default',
    label: 'Data de abertura do chamado',
  },
};

export const ComValor: Story = {
  args: {
    id: 'date-valor',
    label: 'Início da vigência do contrato',
    defaultValue: '2026-01-01',
  },
};

export const ComErro: Story = {
  args: {
    id: 'date-erro',
    label: 'Prazo final do SLA',
    hasError: true,
    message: 'Data inválida para o prazo informado',
    defaultValue: '2026-10-02',
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'date-disabled',
    label: 'Data de encerramento do chamado',
    disabled: true,
    defaultValue: '2026-09-30',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('2026-10-06');
      return (
        <div className="flex flex-col gap-2">
          <EzDateInput
            id="date-interactive"
            label="Agendar visita técnica"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <span className="text-[12px] text-gray-500">Selecionado: {value || '—'}</span>
        </div>
      );
    }
    return <Demo />;
  },
};
