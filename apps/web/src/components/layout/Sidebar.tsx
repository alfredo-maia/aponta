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

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Based on exact ordering from Issue #48
  // TODO: Add RBAC logic filters per item based on user role (CLIENT vs AGENT)
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { to: '/', label: 'Tickets', icon: <Ticket /> },
    { to: '/chats', label: 'Chats', icon: <MessageSquare /> }, 
    { to: '/organizations', label: 'Clientes', icon: <Users /> },
    { to: '/service-desks', label: 'Recursos', icon: <Box /> }, 
    { to: '/contracts', label: 'Contratos', icon: <FileSignature /> },
    { to: '/reports', label: 'Relatórios', icon: <BarChart3 /> },
    { to: '/schedule', label: 'Agenda', icon: <CalendarDays /> }, 
    { to: '/knowledge', label: 'Conhecimentos', icon: <BookOpen /> },
    { to: '/vault', label: 'Cofre de senhas', icon: <Key /> },
    { to: '/settings', label: 'Configurações', icon: <Settings /> },
  ];

  // RBAC filters
  const filteredItems = navItems.filter((item) => {
    if (user?.role === 'CLIENT') {
      return ['Tickets', 'Ajuda (FAQ)', 'Conhecimentos'].includes(item.label);
    }
    // Agents, Admins, etc filter adjustments would go here based on business needs
    return true; 
  });

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
          label={collapsed ? undefined : 'Novo ticket'}
          title="Novo ticket"
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
            onClick={() => navigate(item.to)}
          />
        );
      })}

      <div className="flex-1" />

      {/* Footer / Toggle */}
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