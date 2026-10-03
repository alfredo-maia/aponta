import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Contract {
  id: string;
  organizationId: string;
  organization?: { name: string };
  type: string;
  active: boolean;
  monthlyValue?: number;
  lastAmendmentValue?: number;
  hoursLimit?: number;
  adjustmentDate?: string;
  createdAt: string;
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data } = await api.get<Contract[]>('/contracts');
      return data;
    },
  });
}
