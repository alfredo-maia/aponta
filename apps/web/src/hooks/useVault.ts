import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Credential {
  id: string;
  name: string;
  username?: string;
  password?: string;
  url?: string;
  description?: string;
  organizationId: string;
  organization?: { name: string };
  createdAt: string;
}

export function useVault() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vault'],
    queryFn: async () => {
      const { data } = await api.get<Credential[]>('/vault');
      return data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vault/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] });
    },
  });

  return { query, removeMutation };
}
