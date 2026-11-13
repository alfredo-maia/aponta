import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ApprovalType = 'LANCAMENTO' | 'CRONOMETRO_ENCERRADO';

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  LANCAMENTO: 'Lançamento',
  CRONOMETRO_ENCERRADO: 'Cronômetro encerrado',
};

/** DMTE-462 T5: apontamento pendente de liberação, sem valores financeiros. */
export interface WorklogApproval {
  id: string;
  ticketId: string;
  approvalType: ApprovalType;
  approvalStatus: 'PENDING';
  approvalReason: string;
  minutes: number;
  startTime: string;
  endTime: string;
  ticket: { id: string; protocol: string; title: string };
  author: { id: string; name: string; email: string };
}

const KEY = ['worklog-approvals'];

export function useWorklogApprovals() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<WorklogApproval[]>('/worklog-approvals')).data,
  });
}

/** Libera (sem corpo) ou nega (com o motivo); em ambos a lista recarrega. */
export function useDecideWorklogApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) =>
      note === undefined
        ? (await api.post(`/worklog-approvals/${id}/approve`)).data
        : (await api.post(`/worklog-approvals/${id}/reject`, { note })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
