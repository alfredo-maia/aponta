import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzRadioButton } from './EzRadioButton';

/**
 * Aponta DS Radio Button — input radio estilizado com label opcional
 * (string ou ReactNode) e estado de erro visual (`hasError`). Usado em
 * grupos de seleção única, como prioridade de chamado ou tipo de SLA.
 */
const meta: Meta<typeof EzRadioButton> = {
  title: 'DS/EzRadioButton',
  component: EzRadioButton,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzRadioButton>;

export const Default: Story = {
  args: {
    label: 'Prioridade alta',
    name: 'prioridade',
    onChange: () => undefined,
  },
};

export const Selecionado: Story = {
  args: {
    label: 'SLA de 4h (crítico)',
    name: 'sla',
    checked: true,
    onChange: () => undefined,
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'Organização inativa',
    name: 'organizacao',
    disabled: true,
    onChange: () => undefined,
  },
};

export const ComErro: Story = {
  args: {
    label: 'Cliente sem contrato vigente',
    name: 'cliente',
    hasError: true,
    onChange: () => undefined,
  },
};

export const GrupoInterativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('alta');
      const opcoes = [
        { value: 'alta', label: 'Prioridade alta — SLA 4h' },
        { value: 'media', label: 'Prioridade média — SLA 8h' },
        { value: 'baixa', label: 'Prioridade baixa — SLA 24h' },
      ];
      return (
        <div className="flex flex-col gap-3">
          {opcoes.map((opcao) => (
            <EzRadioButton
              key={opcao.value}
              name="prioridade-chamado"
              label={opcao.label}
              checked={value === opcao.value}
              onChange={() => setValue(opcao.value)}
            />
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};
