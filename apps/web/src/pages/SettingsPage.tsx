import { Link } from 'react-router-dom';
import { User, Users, UserCog, ShieldCheck, Box, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useHasPermission } from '../hooks/usePermissions';
import { EzCardItem } from '../components/ds';

/**
 * Settings hub — mirrors the Tiflux reference UI. "Usuários" is a submenu
 * with 4 items (Minha conta / Usuários / Grupos de atendentes / Grupos de
 * permissões, DMTE-84 Tarefa 4 SPEC); each item beyond "Minha conta" is
 * gated by the matching granular permission instead of `role === 'ADMIN'`.
 */
export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const canManageUsers = useHasPermission('MANAGE_USERS');
  const canManagePermissionGroups = useHasPermission('MANAGE_PERMISSION_GROUPS');

  const usersSubmenuLinks = [
    { to: '/my-account', label: 'Minha conta', icon: User, visible: true },
    { to: '/settings/users', label: 'Usuários', icon: Users, visible: canManageUsers },
    {
      to: '/settings/technical-groups',
      label: 'Grupos de atendentes',
      icon: UserCog,
      visible: canManageUsers,
    },
    {
      to: '/settings/permission-groups',
      label: 'Grupos de permissões',
      icon: ShieldCheck,
      visible: canManagePermissionGroups,
    },
  ].filter((link) => link.visible);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">
        Configurações
      </h1>

      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Usuários
          </h2>
          <EzCardItem flat className="divide-y divide-gray-100 p-0">
            {usersSubmenuLinks.map(({ to, label, icon: Icon }) => (
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

        {isAdmin && (
          <div className="space-y-1.5">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Mesa
            </h2>
            <EzCardItem flat className="p-0">
              <Link
                to="/service-desks"
                className="flex items-center justify-between gap-3 px-4 py-3 text-[14px] text-gray-900 transition-colors hover:bg-gray-90"
              >
                <span className="flex items-center gap-3">
                  <Box className="h-4 w-4 text-gray-500" />
                  Mesa
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            </EzCardItem>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
