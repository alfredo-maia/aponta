import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LayoutDashboard, Ticket, Users, Building2, CalendarClock } from 'lucide-react';
import { EzSidebarNavigator, EzSidebarButton } from './EzSidebar';

/**
 * Aponta DS Sidebar — espelha o `ez-sidebar-navigator`/`ez-sidebar-button`
 * do catálogo Sankhya DS. `EzSidebarNavigator` é o container de navegação
 * lateral (expandido ou recolhido para apenas ícones); `EzSidebarButton` é
 * cada item de navegação, podendo ficar `active` (rota atual) ou
 * `disabled` (funcionalidade ainda não liberada, exibindo um badge
 * "Em breve"). Usado no menu principal do helpdesk (Chamados, Clientes,
 * Organizações, Agenda).
 */
const meta: Meta<typeof EzSidebarNavigator> = {
  title: 'DS/EzSidebar',
  component: EzSidebarNavigator,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSidebarNavigator>;

export const Expandido: Story = {
  render: () => (
    <EzSidebarNavigator>
      <EzSidebarButton label="Painel" icon={<LayoutDashboard size={18} />} active onClick={() => undefined} />
      <EzSidebarButton label="Chamados" icon={<Ticket size={18} />} onClick={() => undefined} />
      <EzSidebarButton label="Clientes" icon={<Users size={18} />} onClick={() => undefined} />
      <EzSidebarButton label="Organizações" icon={<Building2 size={18} />} onClick={() => undefined} />
      <EzSidebarButton label="Agenda" icon={<CalendarClock size={18} />} disabled onClick={() => undefined} />
    </EzSidebarNavigator>
  ),
};

export const Recolhido: Story = {
  render: () => (
    <EzSidebarNavigator collapsed>
      <EzSidebarButton label="Painel" collapsed icon={<LayoutDashboard size={18} />} active onClick={() => undefined} />
      <EzSidebarButton label="Chamados" collapsed icon={<Ticket size={18} />} onClick={() => undefined} />
      <EzSidebarButton label="Clientes" collapsed icon={<Users size={18} />} onClick={() => undefined} />
      <EzSidebarButton label="Agenda" collapsed icon={<CalendarClock size={18} />} disabled onClick={() => undefined} />
    </EzSidebarNavigator>
  ),
};

export const ItemAtivoVsItemDesabilitado: Story = {
  render: () => (
    <EzSidebarNavigator>
      <EzSidebarButton label="Chamados" icon={<Ticket size={18} />} active onClick={() => undefined} />
      <EzSidebarButton label="Agenda (em desenvolvimento)" icon={<CalendarClock size={18} />} disabled onClick={() => undefined} />
    </EzSidebarNavigator>
  ),
};

/**
 * Demo interativa: alterna o item ativo ao clicar, assim como o menu
 * lateral real atualiza a rota corrente do helpdesk.
 */
export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [active, setActive] = useState('chamados');
      const items = [
        { id: 'painel', label: 'Painel', icon: <LayoutDashboard size={18} /> },
        { id: 'chamados', label: 'Chamados', icon: <Ticket size={18} /> },
        { id: 'clientes', label: 'Clientes', icon: <Users size={18} /> },
        { id: 'organizacoes', label: 'Organizações', icon: <Building2 size={18} /> },
      ];
      return (
        <EzSidebarNavigator>
          {items.map((item) => (
            <EzSidebarButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={active === item.id}
              onClick={() => setActive(item.id)}
            />
          ))}
        </EzSidebarNavigator>
      );
    }
    return <Demo />;
  },
};
