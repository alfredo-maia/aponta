import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Valor de uma feature flag registrada na API (apps/api/src/feature-flags).
 * Desligada enquanto carrega, quando a API falha e quando a flag não existe:
 * funcionalidade atrás de flag nunca aparece por engano.
 */
export function useFeatureFlag(key: string): boolean {
  const { data } = useQuery<Record<string, boolean>>({
    queryKey: ['feature-flags'],
    queryFn: async () => (await api.get<Record<string, boolean>>('/feature-flags')).data,
    staleTime: 5 * 60_000,
  });
  return data?.[key] === true;
}
