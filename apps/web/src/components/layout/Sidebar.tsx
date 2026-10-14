import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  EzSidebarNavigator,
  EzSidebarButton,
  EzButton,
} from '../ds';
import {
  Plus,
  LayoutDashboard,
  Ticket,
  MessageSquare,
  Users,
  Box,
  FileSignature,
  BarChart3,
  CalendarDays,
  BookOpen,
  Key,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// Master order fixed by Issue #48. RBAC only ever hides items — it never
// changes this relative order. Items not yet implemented (Chats #45, Agenda
// #46) are kept in their fixed position but rendered disabled with an "Em
// breve" badge, so the final order is already correct once they ship.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { to: '/', label: 'Tickets', icon: <Ticket /> },
  { to: '/chats', label: 'Chats', icon: <MessageSquare />, disabled: true },
  { to: '/organizations', label: 'Clientes', icon: <Users /> },
  { to: '/service-desks', label: 'Mesa', icon: <Box /> },
  { to: '/contracts', label: 'Contratos', icon: <FileSignature /> },
  { to: '/reports', label: 'Relatórios', icon: <BarChart3 /> },
  { to: '/schedule', label: 'Agenda', icon: <CalendarDays /> },
  { to: '/knowledge', label: 'Conhecimentos', icon: <BookOpen /> },
  { to: '/vault', label: 'Cofre de Senhas', icon: <Key /> },
  { to: '/settings', label: 'Configurações', icon: <Settings /> },
];

// Per-role visibility, expressed as the label allow-list. Order is never
// touched here — it always comes from NAV_ITEMS above.
const ROLE_VISIBILITY: Record<string, string[]> = {
  ADMIN: NAV_ITEMS.map((i) => i.label),
  AGENT_MASTER: [
    'Dashboard', 'Tickets', 'Chats', 'Contratos', 'Relatórios',
    'Agenda', 'Conhecimentos', 'Cofre de Senhas', 'Configurações',
  ],
  AGENT: [
    'Dashboard', 'Tickets', 'Chats', 'Contratos', 'Relatórios',
    'Agenda', 'Conhecimentos', 'Cofre de Senhas', 'Configurações',
  ],
  CLIENT_MASTER: [
    'Tickets', 'Contratos', 'Relatórios', 'Agenda', 'Conhecimentos', 'Configurações',
  ],
  CLIENT: ['Tickets', 'Conhecimentos', 'Configurações'],
};

const DEFAULT_VISIBILITY = ['Tickets', 'Conhecimentos', 'Configurações'];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const allowList = user?.role
    ? ROLE_VISIBILITY[user.role] ?? DEFAULT_VISIBILITY
    : DEFAULT_VISIBILITY;

  const filteredItems = NAV_ITEMS.filter((item) => allowList.includes(item.label));

  return (
    <EzSidebarNavigator collapsed={collapsed}>
      {/* Brand & Action Button Header */}
      <div className="flex flex-col gap-3 p-2 mb-2">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900 tracking-tight">Aponta</span>
          )}
          {collapsed && (
            <div className="w-full flex justify-center text-brand-600 font-bold text-lg">A</div>
          )}
        </div>

        <EzButton
          size={collapsed ? 'small' : 'medium'}
          className="w-full"
          leftIcon={Plus}
          onClick={() => navigate('/tickets/new')}
          label={collapsed ? undefined : 'Novo Ticket'}
          title="Novo Ticket"
        />
      </div>

      {/* Navigation Links */}
      {filteredItems.map((item) => {
        // Strict exact match for root '/' specifically so it doesn't stay highlighted forever
        const isActive = item.to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.to);

        return (
          <EzSidebarButton
            key={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            active={isActive}
            disabled={item.disabled}
            onClick={() => navigate(item.to)}
          />
        );
      })}

      <div className="flex-1" />

      {/* Footer / Toggle — fixed, outside the scroll flow of the items above */}
      <div className="mt-auto pt-2 pb-1 border-t border-gray-100">
        <EzSidebarButton
          label={collapsed ? 'Expandir' : 'Esconder'}
          icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          collapsed={collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-900"
        />
      </div>
    </EzSidebarNavigator>
  );
}

export default Sidebar;
