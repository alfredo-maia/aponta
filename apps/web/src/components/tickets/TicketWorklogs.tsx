import { useState, useEffect, Fragment } from 'react';
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
  CheckCircle2,
  Funnel,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  addMinutesToTime,
  brasiliaDateString,
  prefillFromTimer,
  storedIsoToWallClock,
  wallClockToStoredIso,
} from '../../lib/brasiliaTime';
import { preparePastedImage } from '../../lib/preparePastedImage';
import { useAuthStore } from '../../stores/authStore';
import { useWorklogs, useCreateWorklog, useDeleteWorklog, Worklog, AttendanceType, ValuationType } from '../../hooks/useWorklogs';
import type { TicketStatus } from '../../hooks/useTickets';
import { statusLabels } from './TicketCard';
import {
  EzSpinner,
  EzAlert,
  EzTag,
  EzModal,
  EzRichText,
  EzButton,
  EzPopover,
  EzComboBox,
  EzDateInput,
  EzTimeInput,
  EzTextInput,
} from '../ds';
import { cn } from '../ds/utils';
import { isBlankRichText, RichContentView } from './RichContentView';

export function WorklogDescriptionView({ description }: { description: string }) {
  return <RichContentView content={description} />;
}

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
  return brasiliaDateString();
}

function toISO(day: string, timeOfDay: string): string {
  return wallClockToStoredIso(day, timeOfDay);
}

function formatTimeOfDay(iso: string): string {
  return storedIsoToWallClock(iso);
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
    const prefill = prefillFromTimer(start, now, timerSeconds);

    setDay(prefill.day);
    setStartTimeOfDay(prefill.startTime);
    setEndTimeOfDay(prefill.endTime);
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
  const queryClient = useQueryClient();
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/users/agents');
      return res.data;
    },
    enabled: isAdmin,
  });

  // Draft persistence in localStorage per ticket
  const draftStorageKey = `aponta_worklog_draft_${ticketId}`;
  const initialDraft = (() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  })();

  const [day, setDay] = useState<string>(initialDraft?.day || todayStr());
  const [startTimeOfDay, setStartTimeOfDay] = useState<string>(initialDraft?.startTimeOfDay || '08:00');
  const [endTimeOfDay, setEndTimeOfDay] = useState<string>(initialDraft?.endTimeOfDay || '08:30');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>(initialDraft?.attendanceType || 'REMOTE');
  const [description, setDescription] = useState<string>(initialDraft?.description || '');
  const [billable, setBillable] = useState<boolean>(initialDraft?.billable !== undefined ? initialDraft.billable : true);
  const [valuationType, setValuationType] = useState<ValuationType>(initialDraft?.valuationType || 'CONTRACT');
  const [manualValue, setManualValue] = useState<string>(initialDraft?.manualValue || '');
  const [nextStatus, setNextStatus] = useState<string>(initialDraft?.nextStatus || '');
  const [sendAsReply, setSendAsReply] = useState<boolean>(initialDraft?.sendAsReply !== undefined ? initialDraft.sendAsReply : false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(initialDraft?.selectedAuthorId || '');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasDraftLoaded, setHasDraftLoaded] = useState<boolean>(
    Boolean(
      initialDraft &&
        (initialDraft.description ||
          initialDraft.manualValue ||
          initialDraft.nextStatus ||
          initialDraft.sendAsReply ||
          initialDraft.startTimeOfDay !== '08:00' ||
          initialDraft.endTimeOfDay !== '08:30'),
    ),
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterAuthorId, setFilterAuthorId] = useState<string>('');
  const [filterAttendance, setFilterAttendance] = useState<'' | AttendanceType>('');

  // Auto-save draft on every change, including close via X / overlay / refresh.
  useEffect(() => {
    const hasMeaningfulChanges = Boolean(
      !isBlankRichText(description) ||
      manualValue.trim() ||
      nextStatus ||
      sendAsReply ||
      selectedAuthorId ||
      attendanceType !== 'REMOTE' ||
      valuationType !== 'CONTRACT' ||
      startTimeOfDay !== '08:00' ||
      endTimeOfDay !== '08:30' ||
      day !== todayStr(),
    );

    if (!hasMeaningfulChanges) {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      return;
    }

    try {
      const draft = {
        day,
        startTimeOfDay,
        endTimeOfDay,
        attendanceType,
        description,
        billable,
        valuationType,
        manualValue,
        nextStatus,
        sendAsReply,
        selectedAuthorId,
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [
    draftStorageKey,
    day,
    startTimeOfDay,
    endTimeOfDay,
    attendanceType,
    description,
    billable,
    valuationType,
    manualValue,
    nextStatus,
    sendAsReply,
    selectedAuthorId,
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }
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
    setHasDraftLoaded(false);
    setFormError(null);
  };

  const handleUploadImageFile = async (file: File): Promise<string> => {
    setIsUploadingImage(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      const cleanFileName = file.name && file.name !== 'image.png'
        ? file.name
        : `evidencia_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/png';
      const typedFile = file.type === mimeType ? file : new File([file], cleanFileName, { type: mimeType });
      const uploadFile = await preparePastedImage(typedFile);
      formData.append('file', uploadFile, uploadFile.name || cleanFileName);

      const res = await api.post<{ id: string; fileUrl: string; originalName: string }>(
        `/tickets/${ticketId}/attachments`,
        formData,
      );

      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] });
      return res.data.fileUrl;
    } catch {
      setUploadError('Falha ao processar e anexar imagem colada. Tente novamente.');
      throw new Error('image-upload-failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

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

  const authorOptions = Array.from(
    new Map(
      worklogs
        .map((wl) => {
          const id = wl.authorId || wl.author?.id || '';
          return [id, wl.author?.name || 'Técnico'] as const;
        })
        .filter(([id]) => Boolean(id)),
    ).entries(),
  );

  const visibleWorklogs = worklogs
    .filter((wl) => {
      const authorId = wl.authorId || wl.author?.id || '';
      if (filterAuthorId && authorId !== filterAuthorId) return false;
      if (filterAttendance && wl.attendanceType !== filterAttendance) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const delta = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      return sortDir === 'asc' ? delta : -delta;
    });

  const visibleTotalMinutes = visibleWorklogs.reduce((acc, wl) => acc + wl.minutes, 0);
  const visibleTotalValue = visibleWorklogs.reduce((acc, wl) => acc + (wl.value ?? 0), 0);
  const allRowsExpanded =
    visibleWorklogs.length > 0 && visibleWorklogs.every((wl) => Boolean(expandedRows[wl.id]));

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAll = () => {
    if (allRowsExpanded) {
      setExpandedRows({});
      return;
    }
    setExpandedRows(Object.fromEntries(visibleWorklogs.map((wl) => [wl.id, true])));
  };

  const executeSubmit = async (mode: 'NORMAL' | 'CLOSE_TICKET' | 'SAVE_AND_NEW' = 'NORMAL') => {
    setFormError(null);

    if (isBlankRichText(description)) {
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
        description: description.trim() || description,
        billable,
        valuationType,
        ...(valuationType === 'MANUAL' ? { value: parsedManualValue } : {}),
        ...(effectiveNextStatus ? { nextStatus: effectiveNextStatus } : {}),
        ...(sendAsReply ? { sendAsReply: true } : {}),
        ...(isAdmin && selectedAuthorId ? { authorId: selectedAuthorId } : {}),
      });

      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      setHasDraftLoaded(false);

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

            <EzButton
              type="button"
              data-testid="open-worklog-modal-btn"
              size="small"
              leftIcon={Plus}
              label="Apontamento"
              onClick={() => setIsModalOpen(true)}
            />
          </div>
        </div>

        {/* Creation Form Modal (TiFlux Modal Parity) */}
        <EzModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <div className="flex items-center gap-2.5 text-[14px] font-normal text-gray-700">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[12px] shrink-0">
                {(user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500">Você está apontando como:</span>
                <span className="font-semibold text-gray-900">{user?.email?.split('@')[0] || 'Atendente'}</span>
                <span className="text-gray-400 text-[12px]">({user?.email})</span>
              </div>
            </div>
          }
          maxWidth="5xl"
          className="sm:max-h-[92vh]"
        >
          <form onSubmit={handleSubmit} className="space-y-4 pt-1" data-testid="worklog-form">
            {hasDraftLoaded && (
              <div
                data-testid="worklog-draft-alert"
                className="flex items-center justify-between bg-brand-50 border border-brand-200 text-brand-900 px-3.5 py-2 rounded-[6px] text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>Rascunho recuperado. Suas alterações são salvas automaticamente mesmo se a janela for fechada.</span>
                </div>
                <button
                  type="button"
                  data-testid="worklog-clear-draft-btn"
                  onClick={handleClearDraft}
                  className="text-brand-700 hover:text-red-600 hover:underline font-semibold text-[11px] cursor-pointer shrink-0 ml-2"
                >
                  Descartar rascunho
                </button>
              </div>
            )}

            {formError && (
              <EzAlert variant="error" className="py-2 text-[12px]">
                {formError}
              </EzAlert>
            )}

            {/* Row 1: Dia, Horário, Atendimento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <EzDateInput
                id="worklog-day"
                label="Dia"
                required
                data-testid="worklog-day-input"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />

              {/* Horário (início - fim) + chips */}
              <div className="flex flex-col w-full gap-1.5">
                <span className="text-[14px] font-medium leading-none mb-0.5 text-gray-900 select-none">
                  Horário <span className="ml-1 text-red-600">*</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <EzTimeInput
                    data-testid="worklog-start-time-input"
                    value={startTimeOfDay}
                    onChange={(e) => setStartTimeOfDay(e.target.value)}
                    required
                    aria-label="Horário de início"
                  />
                  <span className="text-gray-400 shrink-0">–</span>
                  <EzTimeInput
                    data-testid="worklog-end-time-input"
                    value={endTimeOfDay}
                    onChange={(e) => setEndTimeOfDay(e.target.value)}
                    required
                    aria-label="Horário de término"
                  />
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[11px] text-gray-500 font-mono shrink-0" data-testid="worklog-computed-duration">
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

              <EzComboBox
                id="worklog-attendance-type"
                data-testid="worklog-attendance-type-select"
                label="Atendimento"
                required
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
              >
                <option value="REMOTE">Remoto</option>
                <option value="ON_SITE">Presencial</option>
              </EzComboBox>
            </div>

            {/* Row 2: Deslocamento, Próximo Estágio, Técnico Responsável (se admin) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <EzComboBox id="worklog-displacement" label="Deslocamento" disabled>
                <option value="">Nenhum</option>
              </EzComboBox>

              <EzComboBox
                id="worklog-next-status"
                data-testid="worklog-next-status-select"
                label="Próximo Estágio"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                <option value="">Não alterar</option>
                {ticketStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </EzComboBox>

              {isAdmin ? (
                <EzComboBox
                  id="worklog-author"
                  data-testid="worklog-author-select"
                  label="Técnico Responsável"
                  value={selectedAuthorId}
                  onChange={(e) => setSelectedAuthorId(e.target.value)}
                >
                  <option value="">Eu mesmo ({user?.email})</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </EzComboBox>
              ) : (
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-gray-700 block">Tipo de Cobrança</label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-gray-700">
                      <input
                        type="checkbox"
                        data-testid="worklog-billable-checkbox"
                        checked={billable}
                        onChange={(e) => setBillable(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#00B5A5] focus:ring-[#00B5A5]"
                      />
                      <span>Faturável ao cliente</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Valorização e Cobrança */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
              <EzComboBox
                id="worklog-valuation-type"
                data-testid="worklog-valuation-type-select"
                label="Tipo de Valorização"
                value={valuationType}
                onChange={(e) => {
                  const next = e.target.value as ValuationType;
                  setValuationType(next);
                  if (next === 'GUARANTEE') setBillable(false);
                }}
              >
                <option value="CONTRACT">Contrato</option>
                <option value="GUARANTEE">Garantia</option>
                <option value="MANUAL">Valor manual</option>
              </EzComboBox>

              {valuationType === 'MANUAL' ? (
                <EzTextInput
                  id="worklog-manual-value"
                  label="Valor (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  data-testid="worklog-manual-value-input"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="0,00"
                  required
                />
              ) : (
                <EzTextInput
                  id="worklog-value-display"
                  label="Valor"
                  disabled
                  value={valuationType === 'GUARANTEE' ? 'R$ 0,00' : 'Incluso no contrato'}
                />
              )}

              {isAdmin && (
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-gray-700">
                    <input
                      type="checkbox"
                      data-testid="worklog-billable-checkbox"
                      checked={billable}
                      onChange={(e) => setBillable(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#00B5A5] focus:ring-[#00B5A5]"
                    />
                    <span>Faturável ao cliente</span>
                  </label>
                </div>
              )}
            </div>

            {/* Row 4: Descrição */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-gray-700 block">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  Cole imagens com <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600">Ctrl+V</kbd> — elas entram no documento com o mesmo visual que o cliente vê
                </span>
              </div>
              <EzRichText
                testId="worklog-description-input"
                value={description}
                onChange={setDescription}
                onUploadImage={handleUploadImageFile}
                spellCheck={true}
                lang="pt-BR"
                minHeightClass="min-h-[240px]"
                renderPreview={(html) => <RichContentView content={html} />}
              />
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Corretor ortográfico ativo (pt-BR)
                </span>
                <span>Use o ícone de olho para pré-visualizar o documento do cliente</span>
              </div>

              {isUploadingImage && (
                <div
                  data-testid="worklog-uploading-indicator"
                  className="flex items-center gap-2 text-[12px] text-brand-700 bg-brand-50 border border-brand-200 px-3 py-2 rounded-[6px]"
                >
                  <EzSpinner size={14} />
                  <span>Fazendo upload da captura de tela colada...</span>
                </div>
              )}

              {uploadError && (
                <EzAlert variant="error" className="py-1.5 text-[12px]">
                  {uploadError}
                </EzAlert>
              )}
            </div>

            {/* Checkbox: Enviar também como resposta */}
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-gray-700">
                <input
                  type="checkbox"
                  data-testid="worklog-send-as-reply-checkbox"
                  checked={sendAsReply}
                  onChange={(e) => setSendAsReply(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#00B5A5] focus:ring-[#00B5A5]"
                />
                <span>Enviar apontamento também como resposta</span>
              </label>
            </div>

            {/* Action buttons (DS / Storybook EzButton) */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <EzButton
                type="button"
                data-testid="worklog-submit-close-button"
                variant="tertiary"
                size="small"
                disabled={createMutation.isPending}
                label="Salvar e fechar ticket"
                onClick={() => executeSubmit('CLOSE_TICKET')}
              />
              <EzButton
                type="button"
                data-testid="worklog-submit-new-button"
                variant="secondary"
                size="small"
                disabled={createMutation.isPending}
                label="Salvar e criar novo apontamento"
                onClick={() => executeSubmit('SAVE_AND_NEW')}
              />
              <EzButton
                type="submit"
                data-testid="worklog-submit-button"
                size="small"
                disabled={createMutation.isPending}
                label={createMutation.isPending ? 'Salvando…' : 'Salvar'}
              />
            </div>
          </form>
        </EzModal>

        {/* Worklogs Table / List Header Controls */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <span className="text-[13px] font-medium text-gray-700">Histórico de Apontamentos</span>
          {worklogs.length > 0 && (
            <div className="flex items-center gap-2">
              <EzPopover
                align="right"
                trigger={
                  <button
                    type="button"
                    data-testid="worklog-filter-funnel-btn"
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-[6px] border cursor-pointer',
                      filterAuthorId || filterAttendance
                        ? 'text-brand-700 bg-brand-50 border-brand-200'
                        : 'text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-gray-200',
                    )}
                    title="Filtrar histórico"
                  >
                    <Funnel className="w-3.5 h-3.5" />
                    Filtros
                  </button>
                }
                content={
                  <div className="w-64 space-y-3" data-testid="worklog-filter-popover">
                    <EzComboBox
                      id="worklog-filter-author"
                      data-testid="worklog-filter-author"
                      label="Atendente"
                      value={filterAuthorId}
                      onChange={(e) => setFilterAuthorId(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {authorOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </EzComboBox>
                    <EzComboBox
                      id="worklog-filter-attendance"
                      data-testid="worklog-filter-attendance"
                      label="Atendimento"
                      value={filterAttendance}
                      onChange={(e) => setFilterAttendance(e.target.value as '' | AttendanceType)}
                    >
                      <option value="">Todos</option>
                      <option value="REMOTE">Remoto</option>
                      <option value="ON_SITE">Presencial</option>
                    </EzComboBox>
                    <EzButton
                      type="button"
                      variant="tertiary"
                      size="x-small"
                      label="Limpar filtros"
                      onClick={() => {
                        setFilterAuthorId('');
                        setFilterAttendance('');
                      }}
                    />
                  </div>
                }
              />
              <button
                type="button"
                data-testid="worklog-expand-all-btn"
                onClick={toggleExpandAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-[6px] border border-gray-200 cursor-pointer"
              >
                {allRowsExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Recolher todos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Expandir todos
                  </>
                )}
              </button>
            </div>
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
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        data-testid="worklog-sort-day-btn"
                        onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                        className="inline-flex items-center gap-1 hover:text-gray-800 cursor-pointer"
                      >
                        Data do apontamento
                        {sortDir === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Atendimento</th>
                    <th className="py-2.5 px-3">Deslocamento</th>
                    <th className="py-2.5 px-3">Contrato / Serviço avulso</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visibleWorklogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 px-3 text-center text-[13px] text-gray-500"
                        data-testid="worklog-filter-empty"
                      >
                        Nenhum apontamento corresponde aos filtros selecionados.
                      </td>
                    </tr>
                  )}
                  {visibleWorklogs.map((wl: Worklog) => {
                    const canDelete = isAdmin || wl.authorId === user?.sub;
                    const isRowExpanded = Boolean(expandedRows[wl.id]);
                    const formattedDate = new Date(wl.startTime).toLocaleDateString('pt-BR');
                    const formattedRange = `${formatTimeOfDay(wl.startTime)} - ${formatTimeOfDay(wl.endTime)}`;

                    return (
                      <Fragment key={wl.id}>
                      <tr
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
                      {isRowExpanded && (
                        <tr data-testid={`worklog-detail-${wl.id}`} className="bg-gray-50/70">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="text-[12px] bg-white p-3 rounded-[6px] border border-gray-200 text-gray-800">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                Detalhamento das atividades
                              </span>
                              <WorklogDescriptionView description={wl.description} />
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200 text-[12px]">
                    <td colSpan={6} className="py-2.5 px-3 font-medium text-gray-600">
                      Total de horas:{' '}
                      <strong className="text-gray-900 font-mono" data-testid="worklog-footer-hours">
                        {formatWorklogMinutes(visibleTotalMinutes)}
                      </strong>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-600" colSpan={2}>
                      Total do valor:{' '}
                      <strong className="text-gray-900 font-mono" data-testid="worklog-footer-value">
                        {formatWorklogValue(visibleTotalValue)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TicketWorklogs;
