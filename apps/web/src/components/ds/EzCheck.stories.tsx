import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzCheck } from './EzCheck';

/**
 * Aponta DS Checkbox — usado como toggle liso (ex.: "Visível para
 * clientes", "Faturamento quarteirizado", "Cliente ativo" no painel de
 * Organizações, #57).
 */
const meta: Meta<typeof EzCheck> = {
  title: 'DS/EzCheck',
  component: EzCheck,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzCheck>;

export const Default: Story = {
  args: { id: 'check-default', label: 'Faturamento quarteirizado' },
};

export const Checked: Story = {
  args: { id: 'check-checked', label: 'Visível para clientes', defaultChecked: true },
};

export const Disabled: Story = {
  args: { id: 'check-disabled', label: 'Cliente ativo', disabled: true, defaultChecked: true },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(true);
      return (
        <EzCheck
          id="check-interactive"
          label={checked ? 'Cliente ativo' : 'Cliente inativo'}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      );
    }
    return <Demo />;
  },
};
