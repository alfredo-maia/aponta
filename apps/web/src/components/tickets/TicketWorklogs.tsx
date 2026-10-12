import { useState } from 'react';
import { Clock, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useWorklogs, useCreateWorklog, useDeleteWorklog, Worklog } from '../../hooks/useWorklogs';
import { EzSpinner, EzAlert, EzTag } from '../ds';

interface TicketWorklogsProps {
  ticketId: string;
}

export function formatWorklogMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

export function TicketWorklogs({ ticketId }: TicketWorklogsProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const { data: worklogs = [], isLoading, isError } = useWorklogs(ticketId);
  const createMutation = useCreateWorklog(ticketId);
  const deleteMutation = useDeleteWorklog(ticketId);

  // Agent list for Admin author reassignment
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/users/agents');
      return res.data;
    },
    enabled: isAdmin,
  });

  const [minutes, setMinutes] = useState<number>(30);
  const [description, setDescription] = useState<string>('');
  const [billable, setBillable] = useState<boolean>(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const totalMinutes = worklogs.reduce((acc, wl) => acc + wl.minutes, 0);
  const billableMinutes = worklogs
    .filter((wl) => wl.billable)
    .reduce((acc, wl) => acc + wl.minutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError('Por favor, descreva as atividades executadas.');
      return;
    }

    if (minutes <= 0) {
      setFormError('O tempo apontado deve ser maior que 0 minutos.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        minutes,
        description: description.trim(),
        billable,
        ...(isAdmin && selectedAuthorId ? { authorId: selectedAuthorId } : {}),
      });
      setDescription('');
      setMinutes(30);
      setBillable(true);
      setSelectedAuthorId('');
    } catch {
      setFormError('Falha ao registrar o apontamento. Tente novamente.');
    }
  };

  const handleDelete = async (worklogId: string) => {
    if (window.confirm('Deseja realmente remover este apontamento de horas?')) {
      try {
        await deleteMutation.mutateAsync(worklogId);
      } catch {
        alert('Falha ao remover o apontamento.');
      }
    }
  };

  const handleQuickAddMinutes = (added: number) => {
    setMinutes((prev) => Math.max(5, prev + added));
  };

  return (
    <section className="space-y-4 bg-white rounded-[10px] border border-gray-200 p-5 shadow-xs" data-testid="ticket-worklogs-section">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-600" />
          <h2 className="text-[16px] font-semibold text-gray-900">Apontamento de Horas (Worklog)</h2>
        </div>

        {worklogs.length > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-semibold text-gray-800">Total:</span>
            <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-[4px] border border-brand-200">
              {formatWorklogMinutes(totalMinutes)}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              Faturável: <strong className="text-emerald-700">{formatWorklogMinutes(billableMinutes)}</strong>
            </span>
            {nonBillableMinutes > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  Não faturável: <strong className="text-amber-700">{formatWorklogMinutes(nonBillableMinutes)}</strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Creation Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-[8px] bg-gray-50 border border-gray-200 space-y-3" data-testid="worklog-form">
        <h3 className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-brand-600" />
          Novo Apontamento
        </h3>

        {formError && (
          <EzAlert variant="error" className="py-2 text-[12px]">
            {formError}
          </EzAlert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Minutes input + Quick chips */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-gray-700 block">Tempo Gasto (minutos)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="5"
                data-testid="worklog-minutes-input"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                required
              />
              <span className="text-[12px] text-gray-500 font-mono shrink-0">
                ({formatWorklogMinutes(minutes)})
              </span>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => setMinutes(15)}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium"
              >
                15m
              </button>
              <button
                type="button"
                onClick={() => setMinutes(30)}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium"
              >
                30m
              </button>
              <button
                type="button"
                onClick={() => setMinutes(60)}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium"
              >
                1h
              </button>
              <button
                type="button"
                onClick={() => setMinutes(120)}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium"
              >
                2h
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddMinutes(15)}
                className="px-1.5 py-0.5 text-[10px] bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded text-brand-700 font-medium ml-auto"
              >
                +15m
              </button>
            </div>
          </div>

          {/* Billable Checkbox */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-gray-700 block">Tipo de Cobrança</label>
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-[13px] text-gray-800">
              <input
                type="checkbox"
                data-testid="worklog-billable-checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Horas Faturáveis ao Cliente</span>
            </label>
          </div>

          {/* Admin Author Select */}
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-700 block">Técnico Responsável</label>
              <select
                data-testid="worklog-author-select"
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
              >
                <option value="">Eu mesmo ({user?.email})</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Description textarea */}
        <div className="space-y-1">
          <label className="text-[12px] font-medium text-gray-700 block">Descrição da Atividade</label>
          <textarea
            data-testid="worklog-description-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Análise da procedure no Sankhya, teste de validação e correção do bug..."
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
            required
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            data-testid="worklog-submit-button"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-[6px] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {createMutation.isPending ? (
              <>
                <EzSpinner size={16} />
                Salvando…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Apontar Horas
              </>
            )}
          </button>
        </div>
      </form>

      {/* Worklogs List */}
      <div className="space-y-2 pt-2">
        {isLoading && (
          <div className="py-4 flex justify-center" role="status">
            <EzSpinner label="Carregando apontamentos…" />
          </div>
        )}

        {isError && (
          <EzAlert variant="error">
            Falha ao carregar apontamentos de horas deste chamado.
          </EzAlert>
        )}

        {!isLoading && !isError && worklogs.length === 0 && (
          <p className="text-[13px] text-gray-500 italic text-center py-4 bg-gray-50/50 rounded-[6px]">
            Nenhum apontamento de horas registrado neste chamado até o momento.
          </p>
        )}

        {!isLoading && !isError && worklogs.map((wl: Worklog) => {
          const canDelete = isAdmin || wl.authorId === user?.sub;
          const formattedDate = new Date(wl.createdAt).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          });

          return (
            <div
              key={wl.id}
              data-testid={`worklog-item-${wl.id}`}
              className="flex items-start justify-between gap-3 p-3 rounded-[6px] border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="font-semibold text-gray-900">{wl.author?.name || 'Técnico'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{formattedDate}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded text-[11px] border border-brand-200">
                    {formatWorklogMinutes(wl.minutes)}
                  </span>
                  <EzTag
                    label={wl.billable ? 'Faturável' : 'Não Faturável'}
                    variant={wl.billable ? 'green' : 'gray'}
                  />
                </div>
                <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{wl.description}</p>
              </div>

              {canDelete && (
                <button
                  type="button"
                  data-testid={`worklog-delete-button-${wl.id}`}
                  onClick={() => handleDelete(wl.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors shrink-0"
                  title="Excluir apontamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
