import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface TechnicalGroupListItem {
  id: string;
  name: string;
  description: string | null;
  dailyWorklogEmailEnabled: boolean;
  scheduleEnabled: boolean;
}

export interface TechnicalGroupMember {
  id: string;
  name: string;
  email: string;
}

export interface TechnicalGroupDetail extends TechnicalGroupListItem {
  members: TechnicalGroupMember[];
  organizationLinks: { organization: { id: string; name: string } }[];
  serviceDeskLinks: { serviceDesk: { id: string; name: string } }[];
  permissionGroupLinks: { permissionGroup: { id: string; name: string } }[];
}

const LIST_KEY = ['technical-groups'];

function invalidateGroup(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
  void queryClient.invalidateQueries({ queryKey: [...LIST_KEY, id] });
}

export function useTechnicalGroups() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const { data } = await api.get<TechnicalGroupListItem[]>('/technical-groups');
      return data;
    },
  });
}

export function useTechnicalGroup(id: string | null) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<TechnicalGroupDetail>(`/technical-groups/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTechnicalGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      description?: string;
      dailyWorklogEmailEnabled?: boolean;
      scheduleEnabled?: boolean;
    }) => {
      const { data } = await api.post<TechnicalGroupListItem>('/technical-groups', dto);
      return data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateTechnicalGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<{
      name: string;
      description: string;
      dailyWorklogEmailEnabled: boolean;
      scheduleEnabled: boolean;
    }>) => {
      const { data } = await api.patch<TechnicalGroupDetail>(`/technical-groups/${id}`, dto);
      return data;
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
}

export function useDeleteTechnicalGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/technical-groups/${id}`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useTechnicalGroupMemberMutations(id: string) {
  const queryClient = useQueryClient();
  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/technical-groups/${id}/members/${userId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/technical-groups/${id}/members/${userId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  return { addMember, removeMember };
}

export function useTechnicalGroupOrganizationMutations(id: string) {
  const queryClient = useQueryClient();
  const addOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      await api.post(`/technical-groups/${id}/organizations/${organizationId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  const removeOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      await api.delete(`/technical-groups/${id}/organizations/${organizationId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  return { addOrganization, removeOrganization };
}

export function useTechnicalGroupServiceDeskMutations(id: string) {
  const queryClient = useQueryClient();
  const addServiceDesk = useMutation({
    mutationFn: async (serviceDeskId: string) => {
      await api.post(`/technical-groups/${id}/service-desks/${serviceDeskId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  const removeServiceDesk = useMutation({
    mutationFn: async (serviceDeskId: string) => {
      await api.delete(`/technical-groups/${id}/service-desks/${serviceDeskId}`);
    },
    onSuccess: () => invalidateGroup(queryClient, id),
  });
  return { addServiceDesk, removeServiceDesk };
}
