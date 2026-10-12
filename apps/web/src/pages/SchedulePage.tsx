import { useState, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Appointment, AppointmentType, useAppointments } from '../hooks/useAppointments';
import { AppointmentModal } from '../components/schedule/AppointmentModal';
import {
  EzButton,
  EzPageLayout,
  EzBadge,
  EzSpinner,
} from '../components/ds';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Building,
  Ticket,
} from 'lucide-react';

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SchedulePage() {
  const user = useAuthStore((state) => state.user);

  // Selected date anchor (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterType, setFilterType] = useState<AppointmentType | 'ALL'>('ALL');
  const [filterUserId, setFilterUserId] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | null>(null);

  // Compute start (Monday) and end (Sunday) of the week
  const { weekDays, weekStartISO, weekEndISO } = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    // In JS: 0 is Sunday, 1 is Monday...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      days.push(dayDate);
    }

    return {
      weekDays: days,
      weekStartISO: monday.toISOString(),
      weekEndISO: sunday.toISOString(),
    };
  }, [currentDate]);

  // Query appointments for the current week
  const queryFilters = useMemo(() => {
    return {
      startTime: weekStartISO,
      endTime: weekEndISO,
      type: filterType === 'ALL' ? undefined : filterType,
      userId: filterUserId ? filterUserId : undefined,
    };
  }, [weekStartISO, weekEndISO, filterType, filterUserId]);

  const {
    appointments,
    isLoading,
    createMutation,
    updateMutation,
    removeMutation,
  } = useAppointments(queryFilters);

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

  // Modal openers
  const handleOpenCreate = (dateStr?: string) => {
    setSelectedAppointment(null);
    setModalInitialDate(dateStr || null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (app: Appointment) => {
    setSelectedAppointment(app);
    setModalInitialDate(null);
    setIsModalOpen(true);
  };

  // Group appointments by day (YYYY-MM-DD)
  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const app of appointments) {
      const dayKey = formatDateKey(new Date(app.startTime));
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(app);
    }
    return map;
  }, [appointments]);

  const canCreate = user?.role !== 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';

  const getTypeBadge = (type: AppointmentType) => {
    switch (type) {
      case 'ALLOCATION':
        return <EzBadge size="small" colorClass="bg-emerald-100 text-emerald-800">Alocação</EzBadge>;
      case 'ABSENCE':
        return <EzBadge size="small" colorClass="bg-amber-100 text-amber-800">Ausência</EzBadge>;
      case 'APPOINTMENT':
      default:
        return <EzBadge size="small" colorClass="bg-blue-100 text-blue-800">Compromisso</EzBadge>;
    }
  };

  return (
    <EzPageLayout
      header={
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-brand-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Agenda & Alocação</h1>
                <p className="text-xs text-gray-500">
                  Compromissos, alocações de chamados e ausências da equipe
                </p>
              </div>
            </div>

            {canCreate && (
              <EzButton
                variant="primary"
                size="medium"
                leftIcon={Plus}
                onClick={() => handleOpenCreate()}
                label="Novo Agendamento"
              />
            )}
          </div>

          {/* Controls Bar: Navigation, Period Indicator & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-l-lg"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-x border-gray-200"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-lg"
                  title="Próxima semana"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-sm font-medium text-gray-800 ml-1">
                {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
                {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Type & User Filters */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrar por tipo"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AppointmentType | 'ALL')}
                className="h-[36px] px-3 text-xs font-medium border border-gray-300 rounded-[8px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="APPOINTMENT">Compromissos</option>
                <option value="ALLOCATION">Alocações</option>
                <option value="ABSENCE">Ausências</option>
              </select>

              {isAdmin && (
                <input
                  type="text"
                  placeholder="Filtrar ID do técnico..."
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="h-[36px] px-3 text-xs border border-gray-300 rounded-[8px] bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-[180px]"
                />
              )}
            </div>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <EzSpinner size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 py-4">
          {weekDays.map((day) => {
            const dateStr = formatDateKey(day);
            const isToday = formatDateKey(new Date()) === dateStr;
            const dayAppointments = appointmentsByDay[dateStr] || [];

            const dayName = day.toLocaleDateString('pt-BR', { weekday: 'short' });
            const dayNum = day.getDate();

            return (
              <div
                key={dateStr}
                className={`flex flex-col min-h-[420px] rounded-xl border bg-white shadow-xs transition-all ${
                  isToday ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-200'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2.5 border-b rounded-t-xl ${
                    isToday ? 'bg-brand-50 border-brand-200' : 'bg-gray-50/70 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold capitalize ${
                        isToday ? 'text-brand-700' : 'text-gray-700'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isToday ? 'bg-brand-600 text-white' : 'text-gray-500'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(dateStr)}
                      className="p-1 text-gray-400 hover:text-brand-600 hover:bg-white rounded-md transition-colors"
                      title={`Adicionar compromisso em ${dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Day Appointments Content */}
                <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
                  {dayAppointments.length === 0 ? (
                    <div className="flex items-center justify-center flex-1 text-xs text-gray-400 italic py-6">
                      Livre
                    </div>
                  ) : (
                    dayAppointments.map((app) => {
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
                          onClick={() => handleOpenEdit(app)}
                          className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-brand-300 hover:shadow-xs cursor-pointer transition-all text-left"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                              <Clock className="w-3 h-3" />
                              {startHM} - {endHM}
                            </span>
                            {getTypeBadge(app.type)}
                          </div>

                          <h3 className="text-xs font-bold text-gray-900 line-clamp-2">
                            {app.title}
                          </h3>

                          {app.user && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                              <UserIcon className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{app.user.name}</span>
                            </div>
                          )}

                          {app.organization && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                              <Building className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{app.organization.name}</span>
                            </div>
                          )}

                          {app.ticket && (
                            <div className="flex items-center gap-1 text-[10px] text-brand-600 font-medium truncate">
                              <Ticket className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">#{app.ticket.protocol}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Create/Edit Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
