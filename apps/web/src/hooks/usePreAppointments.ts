import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PreAppointmentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface PreAppointment {
  contractId?: string | null;
  id: string;
  beginning: string;
  ending: string | null;
  initTime: string;
  endTime: string | null;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author?: PreAppointmentAuthor;
  /** DMTE-462 T4: pausa gravada no servidor e motivo da trava (encerrado pelo sistema). */
  pausedAt?: string | null;
  pausedMs?: number;
  lockedReason?: 'LIMIT' | 'PAUSE_EXPIRED' | 'WINDOW_CLOSED' | null;
}

export interface CreatePreAppointmentInput {
  contractId?: string;
  beginning?: string;
  initTime?: string;
}

export interface StopPreAppointmentInput {
  ending?: string;
  endTime?: string;
}

export function preAppointmentsQueryKey(ticketId: string) {
  return ['tickets', ticketId, 'pre-appointments'] as const;
}

export function usePreAppointments(ticketId?: string) {
  return useQuery({
    queryKey: preAppointmentsQueryKey(ticketId || ''),
    queryFn: async () => {
      if (!ticketId) return [];
      const res = await api.get<PreAppointment[]>(
        `/tickets/${ticketId}/pre-appointments`,
      );
      return res.data;
    },
    enabled: Boolean(ticketId),
  });
}

export function useCreatePreAppointment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePreAppointmentInput = {}) => {
      const res = await api.post<PreAppointment>(
        `/tickets/${ticketId}/pre-appointments`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preAppointmentsQueryKey(ticketId),
      });
    },
  });
}

export function useStopPreAppointment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: StopPreAppointmentInput & { id: string }) => {
      const res = await api.patch<PreAppointment>(
        `/tickets/${ticketId}/pre-appointments/${id}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preAppointmentsQueryKey(ticketId),
      });
    },
  });
}

export function useDeletePreAppointment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preAppointmentId: string) => {
      const res = await api.delete(
        `/tickets/${ticketId}/pre-appointments/${preAppointmentId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preAppointmentsQueryKey(ticketId),
      });
    },
  });
}

function usePreAppointmentControl(ticketId: string, action: 'pause' | 'resume') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preAppointmentId: string) => {
      const res = await api.post<PreAppointment>(
        `/tickets/${ticketId}/pre-appointments/${preAppointmentId}/${action}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preAppointmentsQueryKey(ticketId),
      });
    },
  });
}

export const usePausePreAppointment = (ticketId: string) => usePreAppointmentControl(ticketId, 'pause');
export const useResumePreAppointment = (ticketId: string) => usePreAppointmentControl(ticketId, 'resume');
