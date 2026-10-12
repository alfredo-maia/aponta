import { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Headphones,
  ListOrdered,
  Car,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useWorklogs, useCreateWorklog, useDeleteWorklog, Worklog, AttendanceType } from '../../hooks/useWorklogs';
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

export function formatDurationBadge(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMins).padStart(2, '0')}`;
}

export function formatAttendanceType(type: AttendanceType): string {
  return type === 'ON_SITE' ? 'Presencial' : 'Remoto';
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function toISO(day: string, timeOfDay: string): string {
  return `${day}T${timeOfDay}:00Z`;
}

function addMinutesToTime(timeOfDay: string, minutesToAdd: number): string {
  const [h, m] = timeOfDay.split(':').map(Number);
  const total = ((h * 60 + m + minutesToAdd) % 1440 + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatTimeOfDay(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
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

  const [day, setDay] = useState<string>(todayStr());
  const [startTimeOfDay, setStartTimeOfDay] = useState<string>('08:00');
  const [endTimeOfDay, setEndTimeOfDay] = useState<string>('08:30');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('REMOTE');
  const [description, setDescription] = useState<string>('');
  const [billable, setBillable] = useState<boolean>(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [expandAll, setExpandAll] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const computedMinutes = Math.round(
    (new Date(toISO(day, endTimeOfDay)).getTime() - new Date(toISO(day, startTimeOfDay)).getTime()) / 60000,
  );

  const totalMinutes = worklogs.reduce((acc, wl) => acc + wl.minutes, 0);
  const billableMinutes = worklogs
    .filter((wl) => wl.billable)
    .reduce((acc, wl) => acc + wl.minutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;

  const uniqueAgentsCount = new Set(
    worklogs.map((wl) => wl.authorId || (wl.author as { id?: string })?.id).filter(Boolean),
  ).size;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError('Por favor, descreva as atividades executadas.');
      return;
    }

    if (computedMinutes <= 0) {
      setFormError('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        startTime: toISO(day, startTimeOfDay),
        endTime: toISO(day, endTimeOfDay),
        attendanceType,
        description: description.trim(),
        billable,
        ...(isAdmin && selectedAuthorId ? { authorId: selectedAuthorId } : {}),
      });
      setDescription('');
      setDay(todayStr());
      setStartTimeOfDay('08:00');
      setEndTimeOfDay('08:30');
      setAttendanceType('REMOTE');
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

  const handleSetDuration = (durationMinutes: number) => {
    setEndTimeOfDay(addMinutesToTime(startTimeOfDay, durationMinutes));
  };

  const handleExtendEnd = (addedMinutes: number) => {
    setEndTimeOfDay((prev) => addMinutesToTime(prev, addedMinutes));
  };

  return (
    <div className="space-y-4" data-testid="ticket-worklogs-section">
      {/* 4 Summary KPI Cards (TiFlux / Aponta parity) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-[10px] bg-white border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-medium text-gray-500">Atendentes</span>
          <div className="flex items-center gap-2 mt-2 text-[22px] font-bold text-gray-900">
            <Headphones className="w-5 h-5 text-gray-400" />
            <span>{uniqueAgentsCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-white border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-medium text-gray-500">Horas</span>
          <div className="flex items-center gap-2 mt-2 text-[22px] font-bold text-gray-900">
            <Clock className="w-5 h-5 text-gray-400" />
            <span>{formatDurationBadge(totalMinutes)}</span>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-white border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-medium text-gray-500">Apontamentos</span>
          <div className="flex items-center gap-2 mt-2 text-[22px] font-bold text-gray-900">
            <ListOrdered className="w-5 h-5 text-gray-400" />
            <span>{worklogs.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-white border border-gray-200 shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-medium text-gray-500">Deslocamentos</span>
          <div className="flex items-center gap-2 mt-2 text-[22px] font-bold text-gray-900">
            <Car className="w-5 h-5 text-gray-400" />
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Main Apontamentos Panel */}
      <section className="space-y-4 bg-white rounded-[10px] border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <h2 className="text-[16px] font-semibold text-gray-900">Apontamento de Horas (Worklog)</h2>
          </div>

          <div className="flex items-center gap-3">
            {worklogs.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-[13px]">
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

            <button
              type="button"
              onClick={() => setIsFormOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#00B5A5] hover:bg-[#009E90] rounded-[6px] shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Apontamento
            </button>
          </div>
        </div>

        {/* Creation Form */}
        {isFormOpen && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Day */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-gray-700 block">Dia</label>
                <input
                  type="date"
                  data-testid="worklog-day-input"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                  required
                />
              </div>

              {/* Horário (início - fim) + Quick chips */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-gray-700 block">Horário</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    data-testid="worklog-start-time-input"
                    value={startTimeOfDay}
                    onChange={(e) => setStartTimeOfDay(e.target.value)}
                    className="w-full px-2 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                    required
                  />
                  <span className="text-gray-400 shrink-0">–</span>
                  <input
                    type="time"
                    data-testid="worklog-end-time-input"
                    value={endTimeOfDay}
                    onChange={(e) => setEndTimeOfDay(e.target.value)}
                    className="w-full px-2 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                    required
                  />
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[12px] text-gray-500 font-mono shrink-0" data-testid="worklog-computed-duration">
                    {computedMinutes > 0 ? formatWorklogMinutes(computedMinutes) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSetDuration(30)}
                    className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium cursor-pointer"
                  >
                    30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDuration(60)}
                    className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium cursor-pointer"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendEnd(15)}
                    className="px-1.5 py-0.5 text-[10px] bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded text-brand-700 font-medium ml-auto cursor-pointer"
                  >
                    +15m
                  </button>
                </div>
              </div>

              {/* Tipo de atendimento */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-gray-700 block">Tipo de Atendimento</label>
                <select
                  data-testid="worklog-attendance-type-select"
                  value={attendanceType}
                  onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                >
                  <option value="REMOTE">Remoto</option>
                  <option value="ON_SITE">Presencial</option>
                </select>
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
        )}

        {/* Worklogs Table / List Header Controls */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[13px] font-medium text-gray-700">Histórico de Apontamentos</span>
          {worklogs.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandAll((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-[6px] border border-gray-200 cursor-pointer"
            >
              {expandAll ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Recolher todos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Expandir todos
                </>
              )}
            </button>
          )}
        </div>

        {/* Worklogs Table */}
        <div className="space-y-2">
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
            <p className="text-[13px] text-gray-500 italic text-center py-6 bg-gray-50/50 rounded-[6px] border border-dashed border-gray-200">
              Nenhum apontamento de horas registrado neste chamado até o momento.
            </p>
          )}

          {!isLoading && !isError && worklogs.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-[8px]">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[12px] font-medium">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">Atendente</th>
                    <th className="py-2.5 px-3">Data do apontamento</th>
                    <th className="py-2.5 px-3">Atendimento</th>
                    <th className="py-2.5 px-3">Deslocamento</th>
                    <th className="py-2.5 px-3">Contrato / Serviço avulso</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {worklogs.map((wl: Worklog) => {
                    const canDelete = isAdmin || wl.authorId === user?.sub;
                    const isRowExpanded = expandAll || Boolean(expandedRows[wl.id]);
                    const formattedDate = new Date(wl.startTime).toLocaleDateString('pt-BR');
                    const formattedRange = `${formatTimeOfDay(wl.startTime)} - ${formatTimeOfDay(wl.endTime)}`;

                    return (
                      <tr
                        key={wl.id}
                        data-testid={`worklog-item-${wl.id}`}
                        className="hover:bg-gray-50/60 transition-colors group"
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(wl.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                            title={isRowExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                          >
                            {isRowExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium text-gray-900">
                              {wl.author?.name || 'Técnico'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">{formattedDate} {formattedRange}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-bold text-white bg-[#00B5A5]">
                              {formatDurationBadge(wl.minutes)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-gray-600">{formatAttendanceType(wl.attendanceType)}</td>

                        <td className="py-3 px-3 text-gray-400">Nenhum</td>

                        <td className="py-3 px-3">
                          <EzTag
                            label={wl.billable ? 'Faturável' : 'Não Faturável'}
                            variant={wl.billable ? 'green' : 'gray'}
                          />
                        </td>

                        <td className="py-3 px-3 font-mono text-gray-700">
                          {wl.billable ? `R$ ${((wl.minutes / 60) * 100).toFixed(2).replace('.', ',')}` : '—'}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              data-testid={`worklog-delete-button-${wl.id}`}
                              onClick={() => handleDelete(wl.id)}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                              title="Excluir apontamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Expanded descriptions accordion view for clarity */}
              {worklogs.some((wl) => expandAll || expandedRows[wl.id]) && (
                <div className="p-3 bg-gray-50/50 border-t border-gray-100 space-y-2">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Detalhamento das Atividades:
                  </span>
                  {worklogs
                    .filter((wl) => expandAll || expandedRows[wl.id])
                    .map((wl) => (
                      <div
                        key={`desc-${wl.id}`}
                        className="text-[12px] bg-white p-2.5 rounded-[6px] border border-gray-200 text-gray-800"
                      >
                        <strong className="text-gray-900 mr-1.5">{wl.author?.name || 'Técnico'}:</strong>
                        <span className="whitespace-pre-wrap">{wl.description}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TicketWorklogs;
