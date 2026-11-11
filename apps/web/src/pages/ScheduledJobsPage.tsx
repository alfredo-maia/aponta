import { useState } from 'react';
import { EzButton, EzCardItem, EzCheck, EzEmptyCard, EzPageHeader, EzPageLayout, EzSpinner, EzTextInput } from '../components/ds';
import { JobRun, ScheduledJob, useScheduledJobs, useUpdateScheduledJob } from '../hooks/useScheduledJobs';

const JOB_LABELS: Record<string, string> = {
  HEARTBEAT: 'Verificação do agendador',
};
const RUN_STATUS: Record<JobRun['status'], string> = { RUNNING: 'Em execução', SUCCESS: 'Sucesso', FAILED: 'Falhou' };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';

function errorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(message) ? message.join(' ') : message) || 'Não foi possível salvar a tarefa.';
}

function JobCard({ job }: { job: ScheduledJob }) {
  const label = JOB_LABELS[job.type] ?? job.type;
  const update = useUpdateScheduledJob();
  const [cron, setCron] = useState(job.cron);
  const [error, setError] = useState<string | null>(null);

  const save = (body: { cron?: string; enabled?: boolean }) => {
    setError(null);
    update.mutate({ type: job.type, ...body }, { onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <EzCardItem flat className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-gray-900">{label}</h2>
        <EzCheck label="Ativa" aria-label={`Ativa: ${label}`} checked={job.enabled} onChange={() => save({ enabled: !job.enabled })} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <EzTextInput
          id={`cron-${job.type}`}
          label="Cron (minuto hora dia mês dia-da-semana)"
          aria-label={`Cron de ${label}`}
          value={cron}
          onChange={(e) => setCron(e.target.value)}
        />
        <EzButton size="small" aria-label={`Salvar cron de ${label}`} onClick={() => save({ cron })}>
          Salvar
        </EzButton>
      </div>
      {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      <p className="text-[13px] text-gray-600">
        <span>Próxima execução: {when(job.nextRunAt)}</span> · <span>Última execução: {when(job.lastRunAt)}</span>
      </p>
      {job.runs.length > 0 && (
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-gray-500">
              <th className="py-1">Início</th>
              <th className="py-1">Estado</th>
              <th className="py-1">Tentativa</th>
              <th className="py-1">Erro</th>
            </tr>
          </thead>
          <tbody>
            {job.runs.map((run) => (
              <tr key={run.id} className="border-t border-gray-100">
                <td className="py-1">{when(run.startedAt)}</td>
                <td className="py-1">{RUN_STATUS[run.status]}</td>
                <td className="py-1">{run.attempt}</td>
                <td className="py-1">{run.error ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </EzCardItem>
  );
}

export function ScheduledJobsPage() {
  const { data: jobs, isLoading } = useScheduledJobs();
  return (
    <EzPageLayout header={<EzPageHeader title="Tarefas agendadas" />}>
      {isLoading ? (
        <div className="p-8">
          <EzSpinner label="Carregando tarefas…" />
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <EzEmptyCard title="Nenhuma tarefa agendada." />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.type} job={job} />
          ))}
        </div>
      )}
    </EzPageLayout>
  );
}

export default ScheduledJobsPage;
