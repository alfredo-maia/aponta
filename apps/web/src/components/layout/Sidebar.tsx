import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);

  const getNavItems = () => {
    if (user?.role === 'CLIENT') {
      return [
        { to: '/', label: 'Meus Chamados' },
        { to: '/tickets/new', label: 'Abrir Chamado' },
      ];
    }
    
    const base = [
      { to: '/knowledge', label: 'Ajuda (FAQ)' },
      { to: '/', label: 'Caixa de Entrada' },
      { to: '/tickets/new', label: 'Novo Chamado' },
    ];
    
    if (user?.role === 'ADMIN') {
      return [
        ...base, 
        { to: '/vault', label: 'Cofre de Senhas' },
        { to: '/contracts', label: 'Contratos' },
        { to: '/service-desks', label: 'Departamentos' },
        { to: '/organizations', label: 'Empresas' },
        { to: '/reports', label: 'Relatórios' }
      ];
    }
    if (user?.role === 'AGENT_MASTER') {
      return [
        ...base, 
        { to: '/vault', label: 'Cofre de Senhas' },
        { to: '/contracts', label: 'Contratos' },
        { to: '/reports', label: 'Relatórios' }
      ];
    }
    if (user?.role === 'AGENT') {
      return [
        ...base,
        { to: '/vault', label: 'Cofre de Senhas' },
        { to: '/contracts', label: 'Contratos' }
      ];
    }
    
    if (user?.role === 'CLIENT_MASTER') {
      return [
        ...base,
        { to: '/contracts', label: 'Meus Contratos' }
      ];
    }

    return base;
  };

  const items = getNavItems();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background p-4">
      <div className="mb-6 text-xl font-bold">Aponta</div>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
