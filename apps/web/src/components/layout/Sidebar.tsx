import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { to: '/', label: 'Painel' },
  { to: '/tickets/new', label: 'Novo Chamado' },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);

  const items =
    user?.role === 'ADMIN'
      ? [...navItems, { to: '/service-desks', label: 'Departamentos' }]
      : navItems;

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
