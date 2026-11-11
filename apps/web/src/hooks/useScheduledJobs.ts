import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface JobRun {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface ScheduledJob {
  type: string;
  cron: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  failures: number;
  runs: JobRun[];
}

const KEY = ['scheduled-jobs'];

export function useScheduledJobs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<ScheduledJob[]>('/scheduled-jobs')).data,
  });
}

export function useUpdateScheduledJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, ...body }: { type: string; cron?: string; enabled?: boolean }) =>
      (await api.patch<ScheduledJob>(`/scheduled-jobs/${type}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
