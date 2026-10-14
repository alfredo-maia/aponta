import { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Headphones,
  ListOrdered,
  Car,
  ChevronDown,
  ChevronUp,
  User,
  Play,
  Pause,
  Square,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useWorklogs, useCreateWorklog, useDeleteWorklog, Worklog, AttendanceType, ValuationType } from '../../hooks/useWorklogs';
import type { TicketStatus } from '../../hooks/useTickets';
import { statusLabels } from './TicketCard';
import { EzSpinner, EzAlert, EzTag, EzModal } from '../ds';

export interface TicketWorklogsProps {
  ticketId: string;
  defaultModalOpen?: boolean;
  isModalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
}

export function formatTimerSeconds(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

export function formatWorklogValue(value: number | null): string {
  return value === null || value === undefined ? '—' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

const valuationTypeLabels: Record<ValuationType, string> = {
  CONTRACT: 'Contrato',
  GUARANTEE: 'Garantia',
  MANUAL: 'Valor manual',
};

const ticketStatusOptions: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING_CUSTOMER',
  'ON_HOLD',
  'PENDING_APPROVAL',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
];

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

export function TicketWorklogs({
  ticketId,
  defaultModalOpen = false,
  isModalOpen: controlledModalOpen,
  onModalOpenChange,
}: TicketWorklogsProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [internalModalOpen, setInternalModalOpen] = useState<boolean>(defaultModalOpen);
  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const setIsModalOpen = (open: boolean) => {
    setInternalModalOpen(open);
    onModalOpenChange?.(open);
  };

  const { data: worklogs = [], isLoading, isError } = useWorklogs(ticketId);
  const createMutation = useCreateWorklog(ticketId);
  const deleteMutation = useDeleteWorklog(ticketId);

  // Activity Timer state (persisted in localStorage per ticket)
  const timerStorageKey = `aponta_activity_timer_${ticketId}`;
  const [timerActive, setTimerActive] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(timerStorageKey);
    } catch {
      return false;
    }
  });
  const [timerPaused, setTimerPaused] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerStartISO, setTimerStartISO] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(timerStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.startISO || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (!timerActive || timerPaused || !timerStartISO) return;

    const startMs = new Date(timerStartISO).getTime();
    setTimerSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setTimerSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timerPaused, timerStartISO]);

  const handleStartTimer = () => {
    const now = new Date();
    const iso = now.toISOString();
    setTimerStartISO(iso);
    setTimerActive(true);
    setTimerPaused(false);
    setTimerSeconds(0);
    try {
      localStorage.setItem(timerStorageKey, JSON.stringify({ startISO: iso }));
    } catch {
      // ignore
    }
  };

  const handlePauseTimer = () => {
    setTimerPaused(true);
  };

  const handleResumeTimer = () => {
    setTimerPaused(false);
  };

  const handleStopTimer = () => {
    const now = new Date();
    const start = timerStartISO ? new Date(timerStartISO) : new Date(now.getTime() - timerSeconds * 1000);
    const dayStr = start.toISOString().split('T')[0];
    const startStr = formatTimeOfDay(start.toISOString());
    let endStr = formatTimeOfDay(now.toISOString());
    if (startStr === endStr) {
      endStr = addMinutesToTime(startStr, Math.max(1, Math.ceil(timerSeconds / 60)));
    }

    setDay(dayStr);
    setStartTimeOfDay(startStr);
    setEndTimeOfDay(endStr);
    setTimerActive(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    setTimerStartISO(null);
    try {
      localStorage.removeItem(timerStorageKey);
    } catch {
      // ignore
    }
    setIsModalOpen(true);
  };

  const handleCancelTimer = () => {
    setTimerActive(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    setTimerStartISO(null);
    try {
      localStorage.removeItem(timerStorageKey);
    } catch {
      // ignore
    }
  };

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
  const [valuationType, setValuationType] = useState<ValuationType>('CONTRACT');
  const [manualValue, setManualValue] = useState<string>('');
  const [nextStatus, setNextStatus] = useState<string>('');
  const [sendAsReply, setSendAsReply] = useState<boolean>(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
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

  const executeSubmit = async (mode: 'NORMAL' | 'CLOSE_TICKET' | 'SAVE_AND_NEW' = 'NORMAL') => {
    setFormError(null);

    if (!description.trim()) {
      setFormError('Por favor, descreva as atividades executadas.');
      return;
    }

    if (computedMinutes <= 0) {
      setFormError('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    let parsedManualValue: number | undefined;
    if (valuationType === 'MANUAL') {
      parsedManualValue = Number(manualValue);
      if (!manualValue.trim() || Number.isNaN(parsedManualValue)) {
        setFormError('Informe um valor manual válido.');
        return;
      }
    }

    const effectiveNextStatus =
      mode === 'CLOSE_TICKET'
        ? ('CLOSED' as TicketStatus)
        : nextStatus
          ? (nextStatus as TicketStatus)
          : undefined;

    try {
      await createMutation.mutateAsync({
        startTime: toISO(day, startTimeOfDay),
        endTime: toISO(day, endTimeOfDay),
        attendanceType,
        description: description.trim(),
        billable,
        valuationType,
        ...(valuationType === 'MANUAL' ? { value: parsedManualValue } : {}),
        ...(effectiveNextStatus ? { nextStatus: effectiveNextStatus } : {}),
        ...(sendAsReply ? { sendAsReply: true } : {}),
        ...(isAdmin && selectedAuthorId ? { authorId: selectedAuthorId } : {}),
      });

      if (mode === 'SAVE_AND_NEW') {
        const nextStart = endTimeOfDay;
        const nextEnd = addMinutesToTime(nextStart, 30);
        setStartTimeOfDay(nextStart);
        setEndTimeOfDay(nextEnd);
        setDescription('');
        setManualValue('');
        setSendAsReply(false);
      } else {
        setDescription('');
        setDay(todayStr());
        setStartTimeOfDay('08:00');
        setEndTimeOfDay('08:30');
        setAttendanceType('REMOTE');
        setBillable(true);
        setValuationType('CONTRACT');
        setManualValue('');
        setNextStatus('');
        setSendAsReply(false);
        setSelectedAuthorId('');
        setIsModalOpen(false);
      }
    } catch {
      setFormError('Falha ao registrar o apontamento. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSubmit('NORMAL');
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Activity Timer Controls */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-[6px] text-[13px]">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-mono font-bold text-gray-800 min-w-[62px]" data-testid="worklog-timer-display">
                {formatTimerSeconds(timerSeconds)}
              </span>
              {!timerActive ? (
                <button
                  type="button"
                  data-testid="worklog-timer-start-btn"
                  onClick={handleStartTimer}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer"
                  title="Iniciar cronômetro desta atividade"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Iniciar
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {timerPaused ? (
                    <button
                      type="button"
                      data-testid="worklog-timer-resume-btn"
                      onClick={handleResumeTimer}
                      className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer"
                      title="Retomar cronômetro"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="worklog-timer-pause-btn"
                      onClick={handlePauseTimer}
                      className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded cursor-pointer"
                      title="Pausar cronômetro"
                    >
                      <Pause className="w-3 h-3 fill-current" />
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="worklog-timer-stop-btn"
                    onClick={handleStopTimer}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-300 rounded cursor-pointer"
                    title="Parar cronômetro e abrir formulário de apontamento"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Apontar
                  </button>
                  <button
                    type="button"
                    data-testid="worklog-timer-cancel-btn"
                    onClick={handleCancelTimer}
                    className="p-0.5 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                    title="Descartar cronômetro"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

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
              data-testid="open-worklog-modal-btn"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#00B5A5] hover:bg-[#009E90] rounded-[6px] shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Apontamento
            </button>
          </div>
        </div>

        {/* Creation Form Modal (EzModal - TiFlux Parity) */}
        <EzModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Novo Apontamento"
          maxWidth="xl"
        >
          <form onSubmit={handleSubmit} className="p-1 space-y-4" data-testid="worklog-form">

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

              {/* Tipo de valorização */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-gray-700 block">Tipo de Valorização</label>
                <select
                  data-testid="worklog-valuation-type-select"
                  value={valuationType}
                  onChange={(e) => {
                    const next = e.target.value as ValuationType;
                    setValuationType(next);
                    if (next === 'GUARANTEE') setBillable(false);
                  }}
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                >
                  <option value="CONTRACT">Contrato</option>
                  <option value="GUARANTEE">Garantia</option>
                  <option value="MANUAL">Valor manual</option>
                </select>
              </div>

              {/* Valor manual (só quando valuationType = MANUAL) */}
              {valuationType === 'MANUAL' && (
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-gray-700 block">Valor (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    data-testid="worklog-manual-value-input"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                    required
                  />
                </div>
              )}

              {/* Próximo estágio (opcional) */}
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-gray-700 block">Próximo Estágio</label>
                <select
                  data-testid="worklog-next-status-select"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                >
                  <option value="">Não alterar</option>
                  {ticketStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
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
              <label className="text-[12px] font-medium text-gray-700 block">
                Descrição <span className="text-red-500">*</span>
              </label>
              <textarea
                data-testid="worklog-description-input"
                rows={2}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Análise da procedure no Sankhya, teste de validação e correção do bug..."
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white"
                required
              />
              <div className="flex justify-end text-[11px] text-gray-400">
                {description.length}/5000
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-800">
              <input
                type="checkbox"
                data-testid="worklog-send-as-reply-checkbox"
                checked={sendAsReply}
                onChange={(e) => setSendAsReply(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Enviar apontamento também como resposta</span>
            </label>

            {/* Action buttons (TiFlux parity: Salvar e fechar ticket / Salvar e criar novo apontamento / Salvar) */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                data-testid="worklog-submit-close-button"
                disabled={createMutation.isPending}
                onClick={() => executeSubmit('CLOSE_TICKET')}
                className="px-3.5 py-1.5 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-[6px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Salvar e fechar ticket
              </button>
              <button
                type="button"
                data-testid="worklog-submit-new-button"
                disabled={createMutation.isPending}
                onClick={() => executeSubmit('SAVE_AND_NEW')}
                className="px-3.5 py-1.5 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-[6px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Salvar e criar novo apontamento
              </button>
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
                  'Salvar'
                )}
              </button>
            </div>
          </form>
        </EzModal>

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
                          <div className="flex items-center gap-1.5">
                            <span>{formatWorklogValue(wl.value)}</span>
                            <span className="text-[10px] text-gray-400">({valuationTypeLabels[wl.valuationType]})</span>
                          </div>
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
