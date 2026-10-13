import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TicketStatus } from './useTickets';

export interface WorklogAuthor {
  id: string;
  name: string;
  email: string;
}

export type AttendanceType = 'REMOTE' | 'ON_SITE';
export type ValuationType = 'CONTRACT' | 'GUARANTEE' | 'MANUAL';

export interface Worklog {
  id: string;
  description: string;
  minutes: number;
  startTime: string;
  endTime: string;
  attendanceType: AttendanceType;
  billable: boolean;
  valuationType: ValuationType;
  value: number | null;
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
  nextStatus?: TicketStatus;
  sendAsReply?: boolean;
  valuationType?: ValuationType;
  value?: number;
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
      const res = await api.post<Worklog>(`/tickets/${ticketId}/worklogs`, input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteWorklog(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worklogId: string) => {
      const res = await api.delete(`/tickets/${ticketId}/worklogs/${worklogId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'worklogs'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
