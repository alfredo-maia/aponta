import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Contract {
  id: string;
  organizationId: string;
  organization?: { name: string };
  type: string;
  active: boolean;
  approved?: boolean;
  serviceDeskIds?: string[];
  serviceDesks?: { id: string; name: string }[];
  terms?: ContractTerms[];
  scope?: string | null;
  fixedPriceCents?: number | null;
  estimatedMinutes?: number | null;
  monthlyFeeCents?: number | null;
  hourlyRateCents?: number | null;
  conditionsEffectiveAt?: string;
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  includedMinutes?: number | null;
  excessHourlyRateCents?: number | null;
  monthlyValue?: number | null;
  lastAmendmentValue?: number;
  hoursLimit?: number | null;
  adjustmentDate?: string | null;
  createdAt: string;
}

export interface ContractTerms {
  id: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  scope?: string | null;
  fixedPriceCents?: number | null;
  estimatedMinutes?: number | null;
  monthlyFeeCents?: number | null;
  includedMinutes?: number | null;
  excessHourlyRateCents?: number | null;
  hourlyRateCents?: number | null;
}

export interface ContractOrganization {
  id: string;
  name: string;
  serviceDesks?: { id: string; name: string }[];
}

export type ContractInput = Omit<
  Contract,
  | 'id'
  | 'createdAt'
  | 'organization'
  | 'lastAmendmentValue'
  | 'terms'
  | 'serviceDesks'
>;

export function useContracts(search = '') {
  return useQuery({
    queryKey: ['contracts', { search }],
    queryFn: async () => {
      const { data } = await api.get<Contract[]>('/contracts', {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: ['contracts', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Contract>(`/contracts/${id}`)).data,
  });
}

export function useContractOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: ['organizations'],
    enabled,
    queryFn: async () => {
      const organizations = (
        await api.get<ContractOrganization[]>('/organizations')
      ).data;
      return Promise.all(
        organizations.map(async (organization) => ({
          ...organization,
          ...(
            await api.get<ContractOrganization>(
              `/organizations/${organization.id}`,
            )
          ).data,
        })),
      );
    },
  });
}

export function useSaveContract() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: ContractInput;
    }) =>
      (
        await api.post<Contract>(
          id ? `/contracts/${id}/update` : '/contracts',
          values,
        )
      ).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ['contracts'] }),
  });
}
