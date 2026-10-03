import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ApiTokenMeta {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiTokenCreated extends ApiTokenMeta {
  token: string; // only present in the create response, exactly once
}

export function useApiTokens() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['api-tokens'],
    queryFn: async () => {
      const { data } = await api.get<ApiTokenMeta[]>('/api-tokens');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<ApiTokenCreated>('/api-tokens', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api-tokens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  return { listQuery, createMutation, revokeMutation };
}
