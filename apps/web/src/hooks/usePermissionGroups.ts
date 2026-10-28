import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PermissionGroupListItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface PermissionGroupDetail extends PermissionGroupListItem {
  userMembers: { user: { id: string; name: string; email: string } }[];
  technicalGroupLinks: { technicalGroup: { id: string; name: string } }[];
}

export interface PermissionCatalogEntry {
  key: string;
  category: string;
  label: string;
}

const LIST_KEY = ['permission-groups'];

function invalidateGroup(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
  void queryClient.invalidateQueries({ queryKey: [...LIST_KEY, id] });
}

export function usePermissionGroups() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const { data } = await api.get<PermissionGroupListItem[]>('/permission-groups');
      return data;
    },
  });
}

export function usePermissionGroup(id: string | null) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<PermissionGroupDetail>(`/permission-groups/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-groups', 'catalog'],
    queryFn: async () => {
      const { data } = await api.get<PermissionCatalogEntry[]>('/permission-groups/catalog');
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreatePermissionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; description?: string; permissions?: string[] }) => {
      const { data } = await api.post<PermissionGroupListItem>('/permission-groups', dto);
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdatePermissionGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<{ name: string; description: string }>) => {
      const { data } = await api.patch<PermissionGroupDetail>(`/permission-groups/${id}`, dto);
      return data;
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
}

export function useUpdatePermissionGroupPermissions(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (permissions: string[]) => {
      const { data } = await api.patch<PermissionGroupDetail>(
        `/permission-groups/${id}/permissions`,
        { permissions },
      );
      return data;
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
}

export function useDeletePermissionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/permission-groups/${id}`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function usePermissionGroupUserMutations(id: string) {
  const queryClient = useQueryClient();
  const addUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/permission-groups/${id}/users/${userId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/permission-groups/${id}/users/${userId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  return { addUser, removeUser };
}

export function usePermissionGroupTechnicalGroupMutations(id: string) {
  const queryClient = useQueryClient();
  const addTechnicalGroup = useMutation({
    mutationFn: async (technicalGroupId: string) => {
      await api.post(`/permission-groups/${id}/technical-groups/${technicalGroupId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  const removeTechnicalGroup = useMutation({
    mutationFn: async (technicalGroupId: string) => {
      await api.delete(`/permission-groups/${id}/technical-groups/${technicalGroupId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  return { addTechnicalGroup, removeTechnicalGroup };
}
