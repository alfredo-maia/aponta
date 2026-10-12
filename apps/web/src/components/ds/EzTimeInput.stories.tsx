import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTimeInput } from './EzTimeInput';

/**
 * Aponta DS Time Input — wrapper do `<input type="time">` nativo com o
 * estilo do DS. Usado para horário previsto de atendimento e apontamento de
 * horas do técnico.
 */
const meta: Meta<typeof EzTimeInput> = {
  title: 'DS/EzTimeInput',
  component: EzTimeInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTimeInput>;

export const Default: Story = {
  args: {
    id: 'time-input-default',
    label: 'Horário previsto de atendimento',
    defaultValue: '09:00',
  },
};

export const Obrigatorio: Story = {
  args: {
    id: 'time-input-required',
    label: 'Início do apontamento',
    required: true,
    message: 'Informe o horário em que o atendimento começou.',
  },
};

export const ComErro: Story = {
  args: {
    id: 'time-input-erro',
    label: 'Horário de chegada',
    defaultValue: '18:30',
    hasError: true,
    message: 'Horário fora da janela de atendimento contratada (08h às 18h).',
  },
};

export const Disabled: Story = {
  args: {
    id: 'time-input-disabled',
    label: 'Horário de encerramento',
    defaultValue: '17:45',
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [hora, setHora] = useState('08:30');
      return (
        <EzTimeInput
          id="time-input-interactive"
          label="Horário previsto de atendimento"
          value={hora}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHora(e.target.value)}
          message={hora ? `Atendimento agendado para ${hora}.` : undefined}
        />
      );
    }
    return <Demo />;
  },
};
