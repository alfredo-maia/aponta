import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type AppointmentType = 'AGENDA' | 'ABSENCE' | 'VACATION';

export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  userId: string;
  user?: { id: string; name: string; email: string };
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
  ticketId?: string | null;
  ticket?: {
    id: string;
    protocol: string;
    title: string;
    description?: string;
    status?: string;
    requester?: { id: string; name: string; email: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentFilters {
  startTime?: string;
  endTime?: string;
  userId?: string;
  organizationId?: string;
  type?: AppointmentType;
}

export interface CreateAppointmentInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type?: AppointmentType;
  userId?: string;
  organizationId?: string;
  ticketId?: string;
}

export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> {
  id: string;
}

export function useAppointments(filters: AppointmentFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments', {
        params: filters,
      });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const { data } = await api.post<Appointment>('/appointments', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: UpdateAppointmentInput) => {
      const { data } = await api.patch<Appointment>(`/appointments/${id}`, patch);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    appointments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createMutation,
    updateMutation,
    removeMutation,
  };
}
