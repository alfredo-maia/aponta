import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface WorkloadItem {
  agentId: string;
  agentName: string;
  totalMinutes: number;
}

export interface BillingItem {
  organizationId: string;
  organizationName: string;
  billableMinutes: number;
  nonBillableMinutes: number;
}

export function useReportWorkload(agentId?: string) {
  return useQuery({
    queryKey: ['reports', 'workload', agentId].filter(Boolean),
    queryFn: async () => {
      const { data } = await api.get<WorkloadItem[]>('/reports/workload', { params: { agentId } });
      return data;
    },
  });
}

export function useReportBilling(enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'billing'],
    queryFn: async () => {
      const { data } = await api.get<BillingItem[]>('/reports/billing');
      return data;
    },
    enabled,
  });
}
