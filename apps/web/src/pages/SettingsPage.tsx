import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Settings hub — mirrors the Tiflux reference UI, where password/profile
 * changes live under Configurações rather than as a top-level sidebar
 * item. Sidebar now links here instead of directly to /my-account, and
 * ADMIN's "Departamentos" management also moves under this hub.
 */
export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <ul className="max-w-md divide-y rounded-lg border">
        <li>
          <Link
            to="/my-account"
            className="block px-4 py-3 text-sm hover:bg-muted"
          >
            Minha Conta
          </Link>
        </li>
        {isAdmin && (
          <li>
            <Link
              to="/service-desks"
              className="block px-4 py-3 text-sm hover:bg-muted"
            >
              Departamentos
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

export default SettingsPage;
