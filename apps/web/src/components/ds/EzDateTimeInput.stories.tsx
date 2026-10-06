import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzDateTimeInput } from './EzDateTimeInput';

/**
 * Aponta DS DateTime Input — campo `datetime-local` com label opcional e
 * estado de erro. Usado em agendamentos de atendimento, prazos de SLA e
 * vigência de contratos no helpdesk.
 */
const meta: Meta<typeof EzDateTimeInput> = {
  title: 'DS/EzDateTimeInput',
  component: EzDateTimeInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDateTimeInput>;

export const Default: Story = {
  args: { id: 'dt-default', label: 'Data prevista de atendimento' },
};

export const ComValor: Story = {
  args: {
    id: 'dt-valor',
    label: 'Início da vigência do contrato',
    defaultValue: '2026-01-01T08:00',
  },
};

export const ComErro: Story = {
  args: {
    id: 'dt-erro',
    label: 'Prazo de resposta do SLA',
    hasError: true,
    defaultValue: '2026-10-02T14:30',
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'dt-disabled',
    label: 'Data de encerramento do chamado',
    disabled: true,
    defaultValue: '2026-09-30T18:00',
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('2026-10-06T09:00');
      return (
        <div className="flex flex-col gap-2">
          <EzDateTimeInput
            id="dt-interactive"
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
