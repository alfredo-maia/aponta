import { Link } from 'react-router-dom';
import { User, Box, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { EzCardItem } from '../components/ds';

/**
 * Settings hub — mirrors the Tiflux reference UI, where account/department
 * management live under a single Configurações landing page instead of
 * being separate top-level sidebar items.
 */
export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const links = [
    { to: '/my-account', label: 'Minha Conta', icon: User },
    ...(isAdmin
      ? [{ to: '/service-desks', label: 'Departamentos', icon: Box }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">
        Configurações
      </h1>

      <EzCardItem flat className="max-w-md divide-y divide-gray-100 p-0">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] text-gray-900 transition-colors hover:bg-gray-90"
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-gray-500" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
      </EzCardItem>
    </div>
  );
}

export default SettingsPage;
