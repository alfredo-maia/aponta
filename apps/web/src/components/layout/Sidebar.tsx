import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { to: '/', label: 'Painel' },
  { to: '/tickets/new', label: 'Novo Chamado' },
  { to: '/my-account', label: 'Minha Conta' },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const items =
    user?.role === 'ADMIN'
      ? [...navItems, { to: '/service-desks', label: 'Departamentos' }]
      : navItems;

  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r bg-background p-4">
      <div>
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
      </div>

      <div className="space-y-2 border-t pt-4 text-sm">
        {user && <div className="truncate text-muted-foreground">{user.email}</div>}
        <button
          type="button"
          onClick={logout}
          className="w-full rounded border px-3 py-2 text-left hover:bg-muted"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
