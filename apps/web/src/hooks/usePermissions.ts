import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface EffectivePermissions {
  isAdmin: boolean;
  permissions: string[];
}

interface MeResponse extends EffectivePermissions {
  id: string;
}

/**
 * The JWT only carries `role`, never the granular PermissionGroup keys
 * (DMTE-84, Tarefa 4), so effective permissions come from GET /auth/me
 * instead of being derivable from the token already in authStore.
 */
export function useEffectivePermissions() {
  const token = useAuthStore((state) => state.token);
  return useQuery<EffectivePermissions>({
    queryKey: ['auth', 'me', 'permissions'],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>('/auth/me');
      return { isAdmin: data.isAdmin, permissions: data.permissions ?? [] };
    },
    enabled: !!token,
  });
}

export function useHasPermission(key: string): boolean {
  const { data } = useEffectivePermissions();
  if (!data) return false;
  return data.isAdmin || data.permissions.includes(key);
}
