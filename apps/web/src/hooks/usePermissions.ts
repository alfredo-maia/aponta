import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface EffectivePermissions {
  isAdmin: boolean;
  permissions: string[];
  /** DMTE-464: sem bypass de ADMIN; só o grupo de permissões decide. */
  canViewTicketValues: boolean;
  /** DMTE-462: sem desvio por role; só o grupo de permissões libera digitar hora inicial e final. */
  canEditWorklogStartTime: boolean;
  /** DMTE-462 T2: só o grupo de permissões libera marcar compromisso que ignora a regra de apontamento. */
  canReleaseWorklogWithoutSchedule: boolean;
  /** DMTE-462 T5: tem ao menos uma das permissões de liberar apontamento (sem desvio por role). */
  canReleaseWorklogs: boolean;
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
      return {
        isAdmin: data.isAdmin,
        permissions: data.permissions ?? [],
        canViewTicketValues: data.canViewTicketValues === true,
        canEditWorklogStartTime: data.canEditWorklogStartTime === true,
        canReleaseWorklogWithoutSchedule: data.canReleaseWorklogWithoutSchedule === true,
        canReleaseWorklogs: data.canReleaseWorklogs === true,
      };
    },
    enabled: !!token,
  });
}

export function useHasPermission(key: string): boolean {
  const { data } = useEffectivePermissions();
  if (!data) return false;
  return data.isAdmin || data.permissions.includes(key);
}

export function useCanViewTicketValues(): boolean {
  const { data } = useEffectivePermissions();
  return data?.canViewTicketValues === true;
}

/**
 * shortcut: permissivo enquanto /auth/me carrega, para o botão não piscar desativado; o servidor é quem bloqueia.
 */
export function useCanEditWorklogStartTime(): boolean {
  const { data } = useEffectivePermissions();
  return data ? data.canEditWorklogStartTime : true;
}

export function useCanReleaseWorklogWithoutSchedule(): boolean {
  const { data } = useEffectivePermissions();
  return data?.canReleaseWorklogWithoutSchedule === true;
}

/** DMTE-462 T5: o item "Liberações" aparece só para quem tem ao menos uma das permissões de liberar. */
export function useCanReleaseWorklogs(): boolean {
  const { data } = useEffectivePermissions();
  return data?.canReleaseWorklogs === true;
}
