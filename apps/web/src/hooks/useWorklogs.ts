import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Contract } from './useContracts';

export interface WorklogAuthor {
  id: string;
  name: string;
  email: string;
}

export type AttendanceType = 'REMOTE' | 'ON_SITE';
export type ValuationType = 'CONTRACT' | 'GUARANTEE' | 'BONUS' | 'MANUAL';

export interface Worklog {
  timeConvention?: 'UTC';
  id: string;
  description: string;
  minutes: number;
  startTime: string;
  endTime: string;
  attendanceType: AttendanceType;
  billable: boolean;
  valuationType: ValuationType;
  value: number | null;
  valueCents?: number | null;
  costCents?: number | null;
  contractId?: string | null;
  valuationSnapshot?: {
    contractName?: string | null;
    contractId?: string;
    segments?: { coveredMinutes?: number; excessMinutes?: number }[];
  } | null;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author: WorklogAuthor;
}

export interface CreateWorklogInput {
  startTime: string;
  endTime: string;
  attendanceType?: AttendanceType;
  description: string;
  billable?: boolean;
  authorId?: string;
  nextStageId?: string;
  sendAsReply?: boolean;
  valuationType?: ValuationType;
  value?: number;
  contractId?: string;
  bonusReason?: string;
  preAppointmentId?: string;
}

export function useWorklogContracts(
  ticketId: string,
  startTime: string,
  endTime: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['tickets', ticketId, 'worklog-contracts', startTime, endTime],
    enabled: enabled && !!startTime && !!endTime,
    queryFn: async () =>
      (
        await api.get<Contract[]>(`/tickets/${ticketId}/worklog-contracts`, {
          params: { startTime, endTime },
        })
      ).data,
  });
}

export function useWorklogs(ticketId?: string) {
  return useQuery({
    queryKey: ['tickets', ticketId, 'worklogs'],
    queryFn: async () => {
      if (!ticketId) return [];
      const res = await api.get<Worklog[]>(`/tickets/${ticketId}/worklogs`);
      return res.data;
    },
    enabled: Boolean(ticketId),
  });
}

export function useCreateWorklog(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorklogInput) => {
      const res = await api.post<Worklog>(
        `/tickets/${ticketId}/worklogs`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'worklogs'],
      });
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteWorklog(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worklogId: string) => {
      const res = await api.delete(
        `/tickets/${ticketId}/worklogs/${worklogId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'worklogs'],
      });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
