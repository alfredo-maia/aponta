import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzNumberInput } from './EzNumberInput';

/**
 * Aponta DS Number Input — input numérico com botões de incremento e
 * decremento (+/−), limites min/max e step configurável. Usado em campos
 * como quantidade de licenças e prazo de SLA.
 */
const meta: Meta<typeof EzNumberInput> = {
  title: 'DS/EzNumberInput',
  component: EzNumberInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzNumberInput>;

export const Default: Story = {
  args: {
    id: 'number-default',
    label: 'Quantidade de licenças',
    value: 5,
    onChange: () => undefined,
  },
};

export const ComMinMax: Story = {
  args: {
    id: 'number-minmax',
    label: 'SLA de resposta (horas)',
    value: 4,
    min: 1,
    max: 24,
    step: 1,
    onChange: () => undefined,
  },
};

export const StepCustomizado: Story = {
  args: {
    id: 'number-step',
    label: 'Parcelas do quarteirizado',
    value: 4,
    min: 0,
    max: 12,
    step: 2,
    onChange: () => undefined,
  },
};

export const Disabled: Story = {
  args: {
    id: 'number-disabled',
    label: 'Usuários simultâneos',
    value: 10,
    disabled: true,
    onChange: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(2);
      return (
        <EzNumberInput
          id="number-interactive"
          label="Quantidade de licenças"
          value={value}
          min={1}
          max={50}
          onChange={(v) => setValue(v)}
        />
      );
    }
    return <Demo />;
  },
};
