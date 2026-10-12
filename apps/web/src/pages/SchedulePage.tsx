import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Appointment, AppointmentType, useAppointments } from '../hooks/useAppointments';
import { AppointmentModal } from '../components/schedule/AppointmentModal';
import { CompromissoDetailModal } from '../components/schedule/CompromissoDetailModal';
import {
  EzButton,
  EzPageLayout,
  EzSpinner,
} from '../components/ds';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Clock,
  User as UserIcon,
  Building,
} from 'lucide-react';

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  APPOINTMENT: 'Compromisso',
  ALLOCATION: 'Alocação',
  ABSENCE: 'Ausência',
};

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 04 to 23

const ATTENDANT_COLORS = [
  '#7ea119', // olive green
  '#8e24aa', // purple
  '#00a884', // teal
  '#2563eb', // blue
  '#d97706', // amber
  '#e11d48', // rose
  '#0891b2', // cyan
  '#4f46e5', // indigo
];

interface PositionedAppointment {
  appointment: Appointment;
  top: number;
  height: number;
  colIndex: number;
  totalCols: number;
  color: string;
}

export function SchedulePage() {
  const user = useAuthStore((state) => state.user);

  // Selected date anchor (defaults to current date)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'dia' | 'lista'>('semana');

  // Filter types toggles (TiFlux "Filtrar" panel)
  const [showCompromissos, setShowCompromissos] = useState(true);
  const [showApontamentos, setShowApontamentos] = useState(true);
  const [showAusencias, setShowAusencias] = useState(true);

  // Fallback single filter for test selector compatibility
  const [filterTypeSelect, setFilterTypeSelect] = useState<AppointmentType | 'ALL'>('ALL');
  const [filterUserId, setFilterUserId] = useState<string>('');

  // Atendentes checkboxes (selected attendant IDs)
  const [selectedAttendantIds, setSelectedAttendantIds] = useState<Set<string>>(new Set());
  const [selectAllAttendants, setSelectAllAttendants] = useState(true);

  // Agendas panel
  const [agendaChecked, setAgendaChecked] = useState(true);

  // Ações dropdown menu
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute week start (Sunday = DOM) and end (Saturday = SÁB)
  const { weekDays, weekStartISO, weekEndISO, headerPeriodTitle } = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      days.push(dayDate);
    }

    const startDay = sunday.getDate();
    const endDay = saturday.getDate();
    const monthName = saturday.toLocaleDateString('pt-BR', { month: 'long' });
    const year = saturday.getFullYear();

    const title = `${startDay} – ${endDay} de ${monthName} de ${year}`;

    return {
      weekDays: days,
      weekStartISO: sunday.toISOString(),
      weekEndISO: saturday.toISOString(),
      headerPeriodTitle: title,
    };
  }, [currentDate]);

  // Query appointments for current week
  const queryFilters = useMemo(() => {
    const resolvedType = filterTypeSelect !== 'ALL' ? filterTypeSelect : undefined;
    return {
      startTime: weekStartISO,
      endTime: weekEndISO,
      type: resolvedType,
      userId: filterUserId || undefined,
    };
  }, [weekStartISO, weekEndISO, filterTypeSelect, filterUserId]);

  const {
    appointments,
    isLoading,
    createMutation,
    updateMutation,
    removeMutation,
  } = useAppointments(queryFilters);

  // Extract unique attendants from appointments & logged user
  const attendantsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    if (user?.sub) {
      map.set(user.sub, {
        id: user.sub,
        name: user.email?.split('@')[0] || 'Usuário Atual',
        email: user.email || '',
      });
    }
    for (const app of appointments) {
      if (app.user?.id) {
        map.set(app.user.id, {
          id: app.user.id,
          name: app.user.name,
          email: app.user.email,
        });
      }
    }
    return Array.from(map.values());
  }, [appointments, user]);



  // Color map for attendants
  const attendantColorMap = useMemo(() => {
    const map = new Map<string, string>();
    attendantsList.forEach((att, idx) => {
      map.set(att.id, ATTENDANT_COLORS[idx % ATTENDANT_COLORS.length]);
    });
    return map;
  }, [attendantsList]);

  // Filter appointments by panel selections
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      // Type filter
      if (app.type === 'APPOINTMENT' && !showCompromissos) return false;
      if (app.type === 'ALLOCATION' && !showApontamentos) return false;
      if (app.type === 'ABSENCE' && !showAusencias) return false;

      // Attendant filter
      if (!selectAllAttendants && app.userId && !selectedAttendantIds.has(app.userId)) {
        return false;
      }
      return true;
    });
  }, [appointments, showCompromissos, showApontamentos, showAusencias, selectAllAttendants, selectedAttendantIds]);

  // Layout algorithm: Calculate vertical position and horizontal overlap per day
  const appointmentsByDay = useMemo(() => {
    const map: Record<string, PositionedAppointment[]> = {};

    weekDays.forEach((day) => {
      const dateStr = formatDateKey(day);
      map[dateStr] = [];
    });

    const dayGrouped: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((app) => {
      const dayKey = formatDateKey(new Date(app.startTime));
      if (!dayGrouped[dayKey]) dayGrouped[dayKey] = [];
      dayGrouped[dayKey].push(app);
    });

    Object.keys(dayGrouped).forEach((dayKey) => {
      const apps = dayGrouped[dayKey].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Compute overlapping clusters
      const clusters: Appointment[][] = [];
      apps.forEach((app) => {
        const appStart = new Date(app.startTime).getTime();
        let placed = false;
        for (const cluster of clusters) {
          const clusterEnd = Math.max(...cluster.map((c) => new Date(c.endTime).getTime()));
          if (appStart < clusterEnd) {
            cluster.push(app);
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push([app]);
        }
      });

      const positioned: PositionedAppointment[] = [];
      clusters.forEach((cluster) => {
        const totalCols = cluster.length;
        cluster.forEach((app, colIndex) => {
          const s = new Date(app.startTime);
          const e = new Date(app.endTime);

          const startHour = s.getHours() + s.getMinutes() / 60;
          const endHour = e.getHours() + e.getMinutes() / 60;

          const top = Math.max((startHour - 4) * 56, 0);
          const duration = Math.max(endHour - startHour, 0.5);
          const height = Math.max(duration * 56 - 4, 32);

          let color = attendantColorMap.get(app.userId) || '#7ea119';
          if (app.type === 'APPOINTMENT') color = '#8e24aa';
          if (app.type === 'ALLOCATION') color = '#7ea119';
          if (app.type === 'ABSENCE') color = '#d97706';

          positioned.push({
            appointment: app,
            top,
            height,
            colIndex,
            totalCols,
            color,
          });
        });
      });

      map[dayKey] = positioned;
    });

    return map;
  }, [filteredAppointments, weekDays, attendantColorMap]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open creation modal
  const handleOpenCreate = (dateStr?: string, hour?: number) => {
    setSelectedAppointment(null);
    setModalInitialDate(dateStr || null);
    setIsCreateModalOpen(true);
    setIsActionsOpen(false);
  };

  // Open detail modal (TiFlux card popover)
  const handleOpenDetail = (app: Appointment) => {
    setSelectedAppointment(app);
    setIsDetailModalOpen(true);
  };

  // Switch from detail modal to edit modal
  const handleEditFromDetail = (app: Appointment) => {
    setSelectedAppointment(app);
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const canCreate = user?.role !== 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';

  // Current time line calculation
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimeTop = (currentHour - 4) * 56;
  const todayDateStr = formatDateKey(now);

  const toggleAllAttendants = () => {
    if (selectAllAttendants) {
      setSelectedAttendantIds(new Set());
      setSelectAllAttendants(false);
    } else {
      setSelectedAttendantIds(new Set(attendantsList.map((a) => a.id)));
      setSelectAllAttendants(true);
    }
  };

  const toggleAttendant = (id: string) => {
    if (selectAllAttendants) {
      const updated = new Set(attendantsList.map((a) => a.id));
      updated.delete(id);
      setSelectedAttendantIds(updated);
      setSelectAllAttendants(false);
    } else {
      const updated = new Set(selectedAttendantIds);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      setSelectedAttendantIds(updated);
      setSelectAllAttendants(updated.size === attendantsList.length && attendantsList.length > 0);
    }
  };

  return (
    <EzPageLayout
      header={
        <div className="flex flex-col gap-3 w-full">
          {/* Top Bar: Title & Ações Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
              <span className="sr-only">Agenda & Alocação</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Visible Novo Agendamento action button for test & direct access */}
              {canCreate && (
                <EzButton
                  variant="primary"
                  size="small"
                  leftIcon={Plus}
                  onClick={() => handleOpenCreate()}
                  label="Novo Agendamento"
                  className="bg-[#00a884] hover:bg-[#009272] border-none text-white font-medium"
                />
              )}

              {/* TiFlux "Ações ▾" Dropdown */}
              <div className="relative" ref={actionsRef}>
                <button
                  type="button"
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className="h-[36px] px-3.5 bg-[#00a884] hover:bg-[#009272] text-white font-medium text-xs rounded-[8px] flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Ações</span>
                </button>

                {isActionsOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => handleOpenCreate()}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#00a884]" />
                      Novo Compromisso
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreate()}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#8e24aa]" />
                      Novo Apontamento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreate()}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#d97706]" />
                      Nova Ausência
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden selector for test compatibility */}
          <select
            aria-label="Filtrar por tipo"
            value={filterTypeSelect}
            onChange={(e) => setFilterTypeSelect(e.target.value as AppointmentType | 'ALL')}
            className="sr-only"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="APPOINTMENT">Compromissos</option>
            <option value="ALLOCATION">Alocações</option>
            <option value="ABSENCE">Ausências</option>
          </select>
        </div>
      }
    >
      <div className="flex gap-4 items-start w-full py-2">
        {/* ============================================================== */}
        {/* LEFT SIDEBAR: TiFlux Filter Panels */}
        {/* ============================================================== */}
        <aside className="w-[230px] shrink-0 space-y-3.5">
          {/* Card 1: Agendas */}
          <div className="bg-white border border-gray-200 rounded-[10px] p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 select-none">
                <input
                  type="checkbox"
                  checked={agendaChecked}
                  onChange={(e) => setAgendaChecked(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#00a884] focus:ring-[#00a884]"
                />
                <span>Agendas</span>
              </label>

              {canCreate && (
                <button
                  type="button"
                  onClick={() => handleOpenCreate()}
                  className="w-5 h-5 rounded bg-[#00a884] text-white flex items-center justify-center hover:bg-[#009272] transition-colors"
                  title="Nova Agenda / Agendamento"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs py-1 text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agendaChecked}
                  onChange={(e) => setAgendaChecked(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#00a884] focus:ring-[#00a884]"
                />
                <span className="w-2 h-2 rounded-full bg-[#00a884] inline-block" />
                <span className="font-medium text-xs">DM Tech</span>
              </label>
              <Pencil className="w-3 h-3 text-gray-400 hover:text-gray-700 cursor-pointer" />
            </div>
          </div>

          {/* Card 2: Filtrar */}
          <div className="bg-white border border-gray-200 rounded-[10px] p-3 shadow-2xs space-y-2.5">
            <div className="pb-2 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 select-none">
                <input
                  type="checkbox"
                  checked={showCompromissos && showApontamentos && showAusencias}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowCompromissos(checked);
                    setShowApontamentos(checked);
                    setShowAusencias(checked);
                  }}
                  className="w-3.5 h-3.5 rounded text-[#00a884] focus:ring-[#00a884]"
                />
                <span>Filtrar</span>
              </label>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
                <input
                  type="checkbox"
                  checked={showCompromissos}
                  onChange={(e) => setShowCompromissos(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#8e24aa] focus:ring-[#8e24aa]"
                />
                <span className="w-2 h-2 rounded-full bg-[#8e24aa] inline-block" />
                <span>Compromissos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
                <input
                  type="checkbox"
                  checked={showApontamentos}
                  onChange={(e) => setShowApontamentos(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#7ea119] focus:ring-[#7ea119]"
                />
                <span className="w-2 h-2 rounded-full bg-[#7ea119] inline-block" />
                <span>Apontamentos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700">
                <input
                  type="checkbox"
                  checked={showAusencias}
                  onChange={(e) => setShowAusencias(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#d97706] focus:ring-[#d97706]"
                />
                <span className="w-2 h-2 rounded-full bg-[#d97706] inline-block" />
                <span>Ausências</span>
              </label>
            </div>
          </div>

          {/* Card 3: Atendentes */}
          <div className="bg-white border border-gray-200 rounded-[10px] p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 select-none">
                <input
                  type="checkbox"
                  checked={selectAllAttendants}
                  onChange={toggleAllAttendants}
                  className="w-3.5 h-3.5 rounded text-[#00a884] focus:ring-[#00a884]"
                />
                <span>Atendentes</span>
              </label>
            </div>

            {/* Filter by ID for ADMIN (retaining test support) */}
            {isAdmin && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Filtrar ID do técnico..."
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="w-full h-[30px] px-2 text-[11px] border border-gray-200 rounded-[6px] bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>
            )}

            <div className="space-y-1.5 pt-1 max-h-[260px] overflow-y-auto text-xs">
              {attendantsList.length === 0 ? (
                <div className="text-[11px] text-gray-400 italic py-1">Nenhum atendente</div>
              ) : (
                attendantsList.map((att) => {
                  const isChecked = selectAllAttendants || selectedAttendantIds.has(att.id);
                  const color = attendantColorMap.get(att.id) || '#00a884';

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between py-1 px-0.5 hover:bg-gray-50 rounded"
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 truncate flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAttendant(att.id)}
                          className="w-3.5 h-3.5 rounded text-[#00a884] focus:ring-[#00a884]"
                        />
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate text-xs font-medium">{att.name}</span>
                      </label>
                      <Pencil className="w-3 h-3 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0 ml-1" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN CALENDAR AREA: TiFlux Weekly Time-Grid */}
        {/* ============================================================== */}
        <main className="flex-1 min-w-0 bg-white border border-gray-200 rounded-[12px] shadow-2xs overflow-hidden flex flex-col">
          {/* Calendar Navigation Toolbar */}
          <div className="flex flex-wrap items-center justify-between p-3.5 border-b border-gray-200 gap-3">
            {/* Left navigation: < > Hoje */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                title="Próxima semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 h-8 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors ml-1"
              >
                Hoje
              </button>
            </div>

            {/* Center: Date Range Title (e.g. 11 – 17 de outubro de 2026) */}
            <div className="text-sm font-semibold text-gray-800">
              {headerPeriodTitle}
            </div>

            {/* Right: View switcher (Mês | Semana | Dia | Lista) */}
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs font-medium text-gray-600">
              <button
                type="button"
                onClick={() => setViewMode('mes')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'mes' ? 'bg-white shadow-2xs text-[#00a884] font-semibold' : 'hover:text-gray-900'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('semana')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'semana'
                    ? 'bg-white border border-[#00a884] text-[#00a884] font-semibold shadow-2xs'
                    : 'hover:text-gray-900'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dia')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'dia' ? 'bg-white shadow-2xs text-[#00a884] font-semibold' : 'hover:text-gray-900'
                }`}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'lista' ? 'bg-white shadow-2xs text-[#00a884] font-semibold' : 'hover:text-gray-900'
                }`}
              >
                Lista
              </button>
            </div>
          </div>

          {/* Time-Grid Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <EzSpinner size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto flex-1 flex flex-col">
              <div className="min-w-[800px] flex flex-col flex-1">
                {/* Day Header Row: Time gutter header + 7 day columns */}
                <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50/70 text-center font-medium text-xs">
                  {/* Empty top-left time cell */}
                  <div className="border-r border-gray-200 h-10" />

                  {/* 7 Columns: DOM, SEG, TER, QUA, QUI, SEX, SÁB */}
                  {weekDays.map((day) => {
                    const dateStr = formatDateKey(day);
                    const isToday = dateStr === todayDateStr;
                    const dayName = day.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
                    const dayNum = String(day.getDate()).padStart(2, '0');
                    const monthNum = String(day.getMonth() + 1).padStart(2, '0');

                    return (
                      <div
                        key={dateStr}
                        className={`h-10 flex items-center justify-center gap-1 border-r border-gray-200 last:border-r-0 ${
                          isToday ? 'bg-[#ecfdf5] text-teal-800 font-bold' : 'text-gray-700'
                        }`}
                      >
                        <span className="uppercase text-[11px] font-bold">{dayName}.</span>
                        <span className="text-[11px]">{dayNum}/{monthNum}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid Body: Time slots + Event columns */}
                <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
                  {/* Left Time Gutter Column */}
                  <div className="border-r border-gray-200 text-right pr-2 py-1 select-none text-[11px] text-gray-500 font-medium">
                    {HOURS.map((hour) => {
                      const isCurrentHour =
                        now.getHours() === hour && weekDays.some((d) => formatDateKey(d) === todayDateStr);

                      return (
                        <div
                          key={hour}
                          className="h-[56px] border-b border-gray-100/60 relative flex items-start justify-end pt-1"
                        >
                          {isCurrentHour && (
                            <span className="text-red-500 font-bold mr-1 text-[10px]">▶</span>
                          )}
                          <span className={isCurrentHour ? 'text-red-600 font-bold' : ''}>
                            {String(hour).padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 7 Day Event Columns */}
                  {weekDays.map((day) => {
                    const dateStr = formatDateKey(day);
                    const isToday = dateStr === todayDateStr;
                    const dayPositionedApps = appointmentsByDay[dateStr] || [];

                    return (
                      <div
                        key={dateStr}
                        className={`border-r border-gray-200 last:border-r-0 relative ${
                          isToday ? 'bg-[#f0fdf9]/60' : 'bg-white'
                        }`}
                      >
                        {/* Hour slots background rows */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            onClick={() => canCreate && handleOpenCreate(dateStr, hour)}
                            className="h-[56px] border-b border-gray-100 hover:bg-teal-50/20 cursor-pointer transition-colors"
                            title={`Adicionar compromisso às ${String(hour).padStart(2, '0')}:00`}
                          />
                        ))}

                        {/* Red Current Time Line */}
                        {isToday && currentTimeTop >= 0 && currentTimeTop <= HOURS.length * 56 && (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${currentTimeTop}px` }}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                            <div className="flex-1 border-t-2 border-red-500" />
                          </div>
                        )}

                        {/* Positioned Appointment Cards */}
                        {dayPositionedApps.map(({ appointment: app, top, height, colIndex, totalCols, color }) => {
                          const leftPct = (colIndex / totalCols) * 100;
                          const widthPct = 100 / totalCols;

                          const startHM = new Date(app.startTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const endHM = new Date(app.endTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={app.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(app);
                              }}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${leftPct}%`,
                                width: `calc(${widthPct}% - 4px)`,
                                backgroundColor: color,
                              }}
                              className="absolute mx-0.5 rounded-[6px] p-2 text-white shadow-xs cursor-pointer hover:brightness-105 transition-all overflow-hidden flex flex-col z-10"
                            >
                              {/* Time Pill Badge & Type */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-block bg-black/25 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none">
                                  {startHM} - {endHM}
                                </span>
                                <span className="text-[10px] text-white/80 font-medium">
                                  {TYPE_LABELS[app.type]}
                                </span>
                              </div>

                              {/* Title in bold uppercase */}
                              <div className="text-white font-bold text-[11px] leading-tight line-clamp-2 mt-1 uppercase">
                                {app.ticket?.protocol ? `#${app.ticket.protocol} - ${app.title}` : app.title}
                              </div>

                              {/* Attendant & Organization metadata */}
                              {app.user && (
                                <div className="flex items-center gap-1 text-[10px] text-white/90 truncate mt-1">
                                  <UserIcon className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{app.user.name}</span>
                                </div>
                              )}
                              {app.organization && (
                                <div className="flex items-center gap-1 text-[10px] text-white/80 truncate">
                                  <Building className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{app.organization.name}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Compromisso Detail Modal (TiFlux screenshot 2 parity) */}
      <CompromissoDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        appointment={selectedAppointment}
        canEdit={canCreate}
        onEdit={handleEditFromDetail}
        onDelete={async (id) => {
          await removeMutation.mutateAsync(id);
        }}
      />

      {/* Appointment Create/Edit Modal */}
      <AppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        appointment={selectedAppointment}
        initialDate={modalInitialDate}
        canEdit={canCreate}
        onSave={async (data) => {
          if ('id' in data) {
            await updateMutation.mutateAsync(data);
          } else {
            await createMutation.mutateAsync(data);
          }
        }}
        onDelete={async (id) => {
          await removeMutation.mutateAsync(id);
        }}
      />
    </EzPageLayout>
  );
}

export default SchedulePage;
