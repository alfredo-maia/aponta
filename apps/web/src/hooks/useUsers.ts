import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface GroupSummary {
  id: string;
  name: string;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  organizationId: string | null;
  technicalGroup: GroupSummary | null;
  permissionGroups: GroupSummary[];
}

export interface UsersListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsersListParams {
  q?: string;
  page: number;
  pageSize: number;
}

export function useUsersList(params: UsersListParams) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: UserListItem[]; meta: UsersListMeta }>('/users', {
        params,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await api.get<UserListItem>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data } = await api.patch<UserListItem>(`/users/${id}/active`, { active });
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', data.id] });
    },
  });
}
