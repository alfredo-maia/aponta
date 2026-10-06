import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTabs } from './EzTabs';

/**
 * Aponta DS Tabs — usada nas abas do painel de detalhe das organizações
 * (Usuários / Recursos / Relacionamentos / Faturamento, issue #57).
 */
const meta: Meta<typeof EzTabs> = {
  title: 'DS/EzTabs',
  component: EzTabs,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTabs>;

const organizationDetailTabs = [
  { id: 'users', label: 'Usuários' },
  { id: 'resources', label: 'Recursos' },
  { id: 'relationships', label: 'Relacionamentos' },
  { id: 'billing', label: 'Faturamento' },
];

export const OrganizationDetailTabs: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState<string | number>('users');
      return <EzTabs tabs={organizationDetailTabs} activeTab={active} onChange={setActive} />;
    }
    return <Demo />;
  },
};

export const PillsVariant: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState<string | number>('resources');
      return (
        <EzTabs
          tabs={organizationDetailTabs}
          activeTab={active}
          onChange={setActive}
          variant="pills"
        />
      );
    }
    return <Demo />;
  },
};
