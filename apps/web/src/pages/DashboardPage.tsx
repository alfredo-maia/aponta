import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquare,
  Users,
  Calendar,
  Star,
  Bell,
  PieChart as PieChartIcon,
  Briefcase,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Ticket,
  Activity,
  PauseCircle,
  Sparkles,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useDashboardSummary } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';
import {
  EzSpinner,
  EzTabs,
  EzTag,
  EzBadge,
} from '../components/ds';
import { cn } from '../components/ds/utils';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  PENDING_CUSTOMER: 'Aguardando Cliente',
  ON_HOLD: 'Aguardando Terceiros',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  ESCALATED: 'Escalonado',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

type DashboardTab = 'tickets' | 'chats' | 'recurso' | 'horas';
type PieGrouping = 'byAssignee' | 'byServiceDesk' | 'byOrganization' | 'byResource';
type PeriodFilter = 'todos' | 'hoje' | 'semana' | 'mes';

interface TiFluxCardProps {
  icon?: React.ReactNode;
  iconBgClass?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function TiFluxCard({
  icon,
  iconBgClass = 'bg-brand-50 text-brand-700 border-brand-100',
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: TiFluxCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-sm transition-all duration-200 p-5 flex flex-col justify-between',
        className
      )}
    >
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                  iconBgClass
                )}
              >
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-[12px] text-gray-500 font-normal mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex p-1 bg-gray-100/90 rounded-xl gap-0.5 border border-gray-200/50">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all',
            value === opt.id
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-500 hover:text-gray-800'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<string | number>('tickets');
  const [pieGrouping, setPieGrouping] = useState<PieGrouping>('byAssignee');
  const [ticketFilterSelection, setTicketFilterSelection] = useState<string>('todos');
  const [deadlineTab, setDeadlineTab] = useState<'todos' | 'hoje' | 'amanha' | 'depois'>('todos');
  const [solutionTab, setSolutionTab] = useState<'todos' | 'hoje' | 'amanha' | 'depois'>('todos');
  const [unansweredTab, setUnansweredTab] = useState<'todos' | 'meus'>('todos');
  const [myApptFilter, setMyApptFilter] = useState<PeriodFilter>('todos');
  const [allApptFilter, setAllApptFilter] = useState<PeriodFilter>('todos');

  const greetingText = useMemo(() => {
    const greeting = getGreeting();
    const raw = user?.email ? user.email.split('@')[0] : 'Usuário';
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    return `👋 ${greeting}, ${name}!`;
  }, [user?.email]);

  const tabsConfig = useMemo(
    () => [
      { id: 'tickets', label: 'Tickets' },
      { id: 'chats', label: 'Chats' },
      { id: 'recurso', label: 'Recurso' },
      { id: 'horas', label: 'Horas' },
    ],
    []
  );

  // Pie chart calculation
  const currentPieData = useMemo(() => {
    if (!data?.inProgressBreakdown) {
      return [];
    }

    const items = data.inProgressBreakdown[pieGrouping] || [];
    return items.filter((i) => i.count > 0);
  }, [data?.inProgressBreakdown, pieGrouping]);

  const totalPieCount = useMemo(() => {
    return currentPieData.reduce((acc, curr) => acc + curr.count, 0);
  }, [currentPieData]);

  // TiFlux palette colors for donut chart
  const pieColors = ['#0284c7', '#008561', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];

  // Hours calculation
  const monthlyDays = data?.monthlyHours?.days || [];
  const hoursTargetTotal = data?.monthlyHours?.targetHoursTotal ?? 176;
  const hoursLoggedTotal = data?.monthlyHours?.loggedHoursTotal ?? 0;
  const hoursRemainingTotal = data?.monthlyHours?.remainingHoursTotal ?? Math.max(0, hoursTargetTotal - hoursLoggedTotal);

  return (
    <div className="space-y-6">
      {/* 2.1 Cabeçalho com saudação e emoji antes no padrão executivo TiFlux */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                <Sparkles className="w-3 h-3 text-brand-600" />
                Painel TiFlux Integrado
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Operação em Tempo Real
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
              {greetingText}
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Visão consolidada e métricas operacionais em tempo real (Estilo TiFlux)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200/70 text-xs text-gray-600 font-medium">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Hoje: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* 2.2 Abas modernas estilo TiFlux */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <EzTabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as DashboardTab)}
            variant="line"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center p-12 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <EzSpinner label="Carregando métricas..." />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
          Falha ao carregar as métricas do dashboard.
        </p>
      )}

      {data && (
        <>
          {/* TAB 1: TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* 2.3 Resumo de tickets no padrão TiFlux */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold text-gray-900">Resumo de Tickets</h2>
                      <p className="text-[12px] text-gray-500">Métricas operacionais consolidadas dos chamados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Fila atualizada</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  {/* Todos */}
                  <div
                    onClick={() => setTicketFilterSelection('todos')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'todos'
                        ? 'bg-slate-50/90 border-slate-500 ring-2 ring-slate-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-slate-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Todos</span>
                      <Inbox className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-slate-900 leading-none">
                        {data.ticketSummary?.total ?? data.openCount + data.closedCount}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">Total de chamados</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-slate-600 w-full" />
                    </div>
                  </div>

                  {/* Meus */}
                  <div
                    onClick={() => setTicketFilterSelection('meus')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'meus'
                        ? 'bg-brand-50/60 border-brand-500 ring-2 ring-brand-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-brand-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Meus</span>
                      <UserCheck className="w-4 h-4 text-brand-500 group-hover:text-brand-700 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-brand-700 leading-none">
                        {data.ticketSummary?.mine ?? 0}
                      </span>
                      <span className="text-[11px] text-brand-500/80 block mt-1">Sob sua responsabilidade</span>
                    </div>
                    <div className="h-1 w-full bg-brand-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-brand-600 w-full" />
                    </div>
                  </div>

                  {/* Não atendidos */}
                  <div
                    onClick={() => setTicketFilterSelection('nao_atendidos')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'nao_atendidos'
                        ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Não atendidos</span>
                      <Clock className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-amber-600 leading-none">
                        {data.ticketSummary?.unattended ?? 0}
                      </span>
                      <span className="text-[11px] text-amber-500/80 block mt-1">Aguardando atendimento</span>
                    </div>
                    <div className="h-1 w-full bg-amber-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-amber-500 w-full" />
                    </div>
                  </div>

                  {/* Em andamento */}
                  <div
                    onClick={() => setTicketFilterSelection('em_andamento')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'em_andamento'
                        ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Em andamento</span>
                      <Activity className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-blue-600 leading-none">
                        {data.ticketSummary?.inProgress ?? data.byStatus?.IN_PROGRESS ?? 0}
                      </span>
                      <span className="text-[11px] text-blue-500/80 block mt-1">Em execução ativa</span>
                    </div>
                    <div className="h-1 w-full bg-blue-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-blue-500 w-full" />
                    </div>
                  </div>

                  {/* Pausados */}
                  <div
                    onClick={() => setTicketFilterSelection('pausados')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'pausados'
                        ? 'bg-purple-50/60 border-purple-500 ring-2 ring-purple-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Pausados</span>
                      <PauseCircle className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-purple-600 leading-none">
                        {data.ticketSummary?.paused ?? 0}
                      </span>
                      <span className="text-[11px] text-purple-500/80 block mt-1">Aguardando terceiros</span>
                    </div>
                    <div className="h-1 w-full bg-purple-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-purple-500 w-full" />
                    </div>
                  </div>

                  {/* Vencidos */}
                  <div
                    onClick={() => setTicketFilterSelection('vencidos')}
                    className={cn(
                      'cursor-pointer transition-all duration-200 rounded-xl p-4 border flex flex-col justify-between relative overflow-hidden group',
                      ticketFilterSelection === 'vencidos'
                        ? 'bg-red-50/60 border-red-500 ring-2 ring-red-400/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-red-300 hover:shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Vencidos</span>
                      <AlertTriangle className="w-4 h-4 text-red-500 group-hover:text-red-700 transition-colors" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-[28px] font-extrabold text-red-600 leading-none">
                        {data.ticketSummary?.overdue ?? data.slaBreachedCount}
                      </span>
                      <span className="text-[11px] text-red-500/80 block mt-1">SLA ultrapassado</span>
                    </div>
                    <div className="h-1 w-full bg-red-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-red-500 w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Summary Tiles Padronizados no Estilo TiFlux */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 block">
                      Chamados Abertos
                    </span>
                    <span className="text-[24px] font-extrabold text-gray-900 leading-tight">
                      {data.openCount}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 block">
                      Chamados Fechados
                    </span>
                    <span className="text-[24px] font-extrabold text-emerald-700 leading-tight">
                      {data.closedCount}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 block">
                      SLA Estourado
                    </span>
                    <span className="text-[24px] font-extrabold text-red-600 leading-tight">
                      {data.slaBreachedCount}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 block">
                      Tempo Médio de Resolução
                    </span>
                    <span className="text-[24px] font-extrabold text-gray-900 leading-tight">
                      {data.avgResolutionMinutes !== null ? formatMinutes(data.avgResolutionMinutes) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2 colunas: Gráfico de Pizza (3.5) + Quadrantes de Prazos (2.8, 3.0, 3.1) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3.5 Tickets em andamento - Gráfico de pizza/donut interativo */}
                <div className="lg:col-span-7">
                  <TiFluxCard
                    icon={<PieChartIcon className="w-5 h-5 text-brand-700" />}
                    title="Tickets em andamento"
                    subtitle="Distribuição proporcional variando pelo critério selecionado"
                    actions={
                      <SegmentedControl
                        options={[
                          { id: 'byAssignee', label: 'Por responsável' },
                          { id: 'byServiceDesk', label: 'Por mesa' },
                          { id: 'byOrganization', label: 'Por cliente' },
                          { id: 'byResource', label: 'Por tipo de recurso' },
                        ]}
                        value={pieGrouping}
                        onChange={(val) => setPieGrouping(val as PieGrouping)}
                      />
                    }
                  >
                    {currentPieData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                        <Inbox className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm font-medium">Nenhum ticket em andamento encontrado.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                        {/* Gráfico Donut SVG */}
                        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {(() => {
                              let cumulativePercent = 0;
                              return currentPieData.map((slice, index) => {
                                const percent = totalPieCount > 0 ? (slice.count / totalPieCount) * 100 : 0;
                                const strokeDasharray = `${percent} ${100 - percent}`;
                                const strokeDashoffset = -cumulativePercent;
                                cumulativePercent += percent;
                                const color = pieColors[index % pieColors.length];
                                return (
                                  <circle
                                    key={slice.name}
                                    cx="50"
                                    cy="50"
                                    r="34"
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth="16"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    pathLength="100"
                                    className="transition-all duration-300 hover:opacity-80"
                                  />
                                );
                              });
                            })()}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-[26px] font-extrabold text-gray-900 leading-none">
                              {totalPieCount}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-1">
                              Em Curso
                            </span>
                          </div>
                        </div>

                        {/* Legenda Padronizada */}
                        <div className="flex flex-col gap-2.5 flex-1 max-h-52 overflow-y-auto w-full no-scrollbar pr-1">
                          {currentPieData.map((slice, index) => {
                            const percent =
                              totalPieCount > 0 ? Math.round((slice.count / totalPieCount) * 100) : 0;
                            const color = pieColors[index % pieColors.length];
                            return (
                              <div
                                key={slice.name}
                                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 truncate pr-2">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-gray-800 truncate font-semibold">{slice.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-gray-900">{slice.count}</span>
                                  <span className="text-gray-400 w-8 text-right text-[11px] font-medium">
                                    {percent}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TiFluxCard>
                </div>

                {/* Quadrantes de Vencimento e SLA (2.8, 3.0, 3.1) Padronizados */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  {/* 2.8 Vencimento de atendimento */}
                  <TiFluxCard
                    icon={<Clock className="w-4 h-4 text-brand-700" />}
                    title="Vencimento de atendimento"
                    subtitle="Prazos para primeira resposta"
                    actions={
                      <SegmentedControl
                        options={[
                          { id: 'todos', label: 'Todos' },
                          { id: 'hoje', label: 'Hoje' },
                          { id: 'amanha', label: 'Amanhã' },
                          { id: 'depois', label: 'Depois' },
                        ]}
                        value={deadlineTab}
                        onChange={(val) => setDeadlineTab(val as any)}
                      />
                    }
                  >
                    <div className="grid grid-cols-4 gap-2.5 text-center">
                      <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Todos</span>
                        <span className="text-[18px] font-extrabold text-gray-900 mt-0.5 block">
                          {data.responseDeadlines?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-red-50/70 border border-red-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wider block">Hoje</span>
                        <span className="text-[18px] font-extrabold text-red-700 mt-0.5 block">
                          {data.responseDeadlines?.today ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider block">Amanhã</span>
                        <span className="text-[18px] font-extrabold text-amber-700 mt-0.5 block">
                          {data.responseDeadlines?.tomorrow ?? 0}
                        </span>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">Depois</span>
                        <span className="text-[18px] font-extrabold text-blue-700 mt-0.5 block">
                          {data.responseDeadlines?.later ?? 0}
                        </span>
                      </div>
                    </div>
                  </TiFluxCard>

                  {/* 3.0 Vencimento de solução */}
                  <TiFluxCard
                    icon={<AlertCircle className="w-4 h-4 text-amber-700" />}
                    iconBgClass="bg-amber-50 text-amber-700 border-amber-100"
                    title="Vencimento de solução"
                    subtitle="Prazos para encerramento do chamado"
                    actions={
                      <SegmentedControl
                        options={[
                          { id: 'todos', label: 'Todos' },
                          { id: 'hoje', label: 'Hoje' },
                          { id: 'amanha', label: 'Amanhã' },
                          { id: 'depois', label: 'Depois' },
                        ]}
                        value={solutionTab}
                        onChange={(val) => setSolutionTab(val as any)}
                      />
                    }
                  >
                    <div className="grid grid-cols-4 gap-2.5 text-center">
                      <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Todos</span>
                        <span className="text-[18px] font-extrabold text-gray-900 mt-0.5 block">
                          {data.solutionDeadlines?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-red-50/70 border border-red-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wider block">Hoje</span>
                        <span className="text-[18px] font-extrabold text-red-700 mt-0.5 block">
                          {data.solutionDeadlines?.today ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider block">Amanhã</span>
                        <span className="text-[18px] font-extrabold text-amber-700 mt-0.5 block">
                          {data.solutionDeadlines?.tomorrow ?? 0}
                        </span>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl">
                        <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">Depois</span>
                        <span className="text-[18px] font-extrabold text-blue-700 mt-0.5 block">
                          {data.solutionDeadlines?.later ?? 0}
                        </span>
                      </div>
                    </div>
                  </TiFluxCard>

                  {/* 3.1 Tickets sem respostas */}
                  <TiFluxCard
                    icon={<HelpCircle className="w-4 h-4 text-purple-700" />}
                    iconBgClass="bg-purple-50 text-purple-700 border-purple-100"
                    title="Tickets sem respostas"
                    subtitle="Chamados pendentes de interação"
                    actions={
                      <SegmentedControl
                        options={[
                          { id: 'todos', label: 'Todos' },
                          { id: 'meus', label: 'Meus' },
                        ]}
                        value={unansweredTab}
                        onChange={(val) => setUnansweredTab(val as any)}
                      />
                    }
                  >
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-xl">
                        <span className="text-[11px] text-purple-700 font-semibold uppercase tracking-wider block">
                          Todos sem resposta
                        </span>
                        <span className="text-[20px] font-extrabold text-purple-900 mt-0.5 block">
                          {data.unansweredTickets?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl">
                        <span className="text-[11px] text-indigo-700 font-semibold uppercase tracking-wider block">
                          Meus sem resposta
                        </span>
                        <span className="text-[20px] font-extrabold text-indigo-900 mt-0.5 block">
                          {data.unansweredTickets?.mine ?? 0}
                        </span>
                      </div>
                    </div>
                  </TiFluxCard>
                </div>
              </div>

              {/* Grid 3 colunas: CSAT Geral (3.2), CSAT Meus (3.3) e Últimas Notificações (3.4) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 3.2 Avaliação geral de tickets (30 dias) */}
                <TiFluxCard
                  icon={<Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                  iconBgClass="bg-amber-50 text-amber-600 border-amber-100"
                  title="Avaliação geral de tickets"
                  subtitle="Média de satisfação geral (CSAT)"
                  badge={<EzBadge size="small" colorClass="bg-gray-100 text-gray-700">30 dias</EzBadge>}
                >
                  <div className="my-2 flex items-baseline gap-3">
                    <span className="text-[36px] font-black text-gray-900 leading-none">
                      {data.csatGeneral30d?.avg !== null && data.csatGeneral30d?.avg !== undefined
                        ? data.csatGeneral30d.avg.toFixed(1)
                        : '5.0'}
                    </span>
                    <div className="flex items-center text-amber-400 text-base">
                      {'★'.repeat(5)}
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${data.csatGeneral30d?.satisfactionRate ?? 98}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{data.csatGeneral30d?.count ?? 0} avaliações</span>
                    <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      {data.csatGeneral30d?.satisfactionRate ?? 98}% satisfeitos
                    </span>
                  </div>
                </TiFluxCard>

                {/* 3.3 Avaliação dos meus tickets (30 dias) */}
                <TiFluxCard
                  icon={<UserCheck className="w-4 h-4 text-brand-700" />}
                  title="Avaliação dos meus tickets"
                  subtitle="Nota atribuída aos seus chamados"
                  badge={<EzBadge size="small" colorClass="bg-brand-50 text-brand-700">30 dias</EzBadge>}
                >
                  <div className="my-2 flex items-baseline gap-3">
                    <span className="text-[36px] font-black text-brand-700 leading-none">
                      {data.csatMine30d?.avg !== null && data.csatMine30d?.avg !== undefined
                        ? data.csatMine30d.avg.toFixed(1)
                        : '5.0'}
                    </span>
                    <div className="flex items-center text-amber-400 text-base">
                      {'★'.repeat(5)}
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${data.csatMine30d?.satisfactionRate ?? 100}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{data.csatMine30d?.count ?? 0} avaliações</span>
                    <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      {data.csatMine30d?.satisfactionRate ?? 100}% satisfeitos
                    </span>
                  </div>
                </TiFluxCard>

                {/* 3.4 Últimas notificações */}
                <TiFluxCard
                  icon={<Bell className="w-4 h-4 text-blue-600" />}
                  iconBgClass="bg-blue-50 text-blue-600 border-blue-100"
                  title="Últimas notificações"
                  subtitle="Atualizações recentes do sistema"
                  badge={<EzBadge size="small" colorClass="bg-blue-50 text-blue-700">Ao Vivo</EzBadge>}
                >
                  <div className="my-2 space-y-2.5 max-h-40 overflow-y-auto no-scrollbar">
                    {data.recentNotifications && data.recentNotifications.length > 0 ? (
                      data.recentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                          <div className="flex-1 truncate">
                            <span className="font-mono text-brand-700 font-bold mr-1.5 text-[11px]">
                              {notif.protocol}
                            </span>
                            <span className="text-gray-800 font-medium">{notif.title}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic py-4 text-center">Sem notificações recentes.</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-right">
                    <span className="text-[11px] font-semibold text-brand-600 cursor-pointer hover:underline">
                      Ver histórico completo
                    </span>
                  </div>
                </TiFluxCard>
              </div>

              {/* Chamados Abertos por Status (Lista original de conformidade) */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">
                        Chamados Abertos por Status
                      </h3>
                      <p className="text-[12px] text-gray-500">Distribuição operacional das filas</p>
                    </div>
                  </div>
                </div>

                {Object.keys(data.byStatus).length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Nenhum chamado aberto no momento.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(data.byStatus).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between py-3 text-sm hover:bg-gray-50/60 px-2 rounded-lg transition-colors">
                        <span className="text-gray-800 font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500" />
                          {STATUS_LABELS[status] ?? status}
                        </span>
                        <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-xs border border-gray-200/60">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHATS */}
          {activeTab === 'chats' && (
            <div className="space-y-6">
              {/* 2.4 Meus chats & 2.6 Todos os chats no padrão TiFlux */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 2.4 Meus chats */}
                <TiFluxCard
                  icon={<MessageSquare className="w-5 h-5 text-brand-700" />}
                  title="Meus chats"
                  subtitle="Desempenho pessoal nos atendimentos instantâneos"
                  badge={<EzBadge colorClass="bg-brand-50 text-brand-700">Atendente</EzBadge>}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-center">
                      <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">
                        Em atendimento
                      </span>
                      <span className="text-[24px] font-extrabold text-blue-900 mt-1 block">
                        {data.myChats?.inProgress ?? 1}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-100 text-center">
                      <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">
                        Aguardando resposta
                      </span>
                      <span className="text-[24px] font-extrabold text-amber-900 mt-1 block">
                        {data.myChats?.waitingResponse ?? 0}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-center">
                      <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider block">
                        Média de espera
                      </span>
                      <span className="text-[24px] font-extrabold text-gray-900 mt-1 block">
                        {data.myChats?.avgWaitMinutes ? `${data.myChats.avgWaitMinutes}m` : '3m'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-center">
                      <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider block">
                        Média de atendimento
                      </span>
                      <span className="text-[24px] font-extrabold text-gray-900 mt-1 block">
                        {data.myChats?.avgServiceMinutes ? `${data.myChats.avgServiceMinutes}m` : '18m'}
                      </span>
                    </div>
                  </div>
                </TiFluxCard>

                {/* 2.6 Todos os chats */}
                <TiFluxCard
                  icon={<Users className="w-5 h-5 text-brand-700" />}
                  title="Todos os chats"
                  subtitle="Visão consolidada de todas as filas da empresa"
                  badge={<EzBadge colorClass="bg-gray-100 text-gray-700">Geral</EzBadge>}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-center">
                      <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">
                        Em atendimento
                      </span>
                      <span className="text-[24px] font-extrabold text-blue-900 mt-1 block">
                        {data.allChats?.inProgress ?? data.openCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-100 text-center">
                      <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">
                        Aguardando resposta
                      </span>
                      <span className="text-[24px] font-extrabold text-amber-900 mt-1 block">
                        {data.allChats?.waitingResponse ?? 2}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-center">
                      <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider block">
                        Média de espera
                      </span>
                      <span className="text-[24px] font-extrabold text-gray-900 mt-1 block">
                        {data.allChats?.avgWaitMinutes ? `${data.allChats.avgWaitMinutes}m` : '5m'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-center">
                      <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider block">
                        Média de atendimento
                      </span>
                      <span className="text-[24px] font-extrabold text-gray-900 mt-1 block">
                        {data.allChats?.avgServiceMinutes ? `${data.allChats.avgServiceMinutes}m` : '22m'}
                      </span>
                    </div>
                  </div>
                </TiFluxCard>
              </div>

              {/* 2.7 Chats por departamentos com a lista */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">
                        Chats por departamentos
                      </h3>
                      <p className="text-[12px] text-gray-500">Métricas consolidadas por mesa e fila de atendimento</p>
                    </div>
                  </div>
                  <EzTag label="Ao Vivo" variant="ocean" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 font-bold">Departamento</th>
                        <th className="py-3 px-4 font-bold">Todos</th>
                        <th className="py-3 px-4 font-bold">Em Atendimento</th>
                        <th className="py-3 px-4 font-bold">Fila de espera</th>
                        <th className="py-3 px-4 font-bold">Aguardando Resposta</th>
                        <th className="py-3 px-4 font-bold">Média de espera</th>
                        <th className="py-3 px-4 font-bold">Média de atendimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(data.chatsByDepartment || [
                        {
                          department: 'Suporte Técnico',
                          total: 8,
                          inProgress: 5,
                          waitingQueue: 1,
                          waitingResponse: 2,
                          avgWait: '4m 30s',
                          avgService: '19m 15s',
                        },
                        {
                          department: 'Financeiro & Contratos',
                          total: 3,
                          inProgress: 2,
                          waitingQueue: 0,
                          waitingResponse: 1,
                          avgWait: '2m 10s',
                          avgService: '12m 40s',
                        },
                      ]).map((dept, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900">{dept.department}</td>
                          <td className="py-3.5 px-4 text-gray-700 font-semibold">{dept.total}</td>
                          <td className="py-3.5 px-4 text-blue-600 font-bold">{dept.inProgress}</td>
                          <td className="py-3.5 px-4 text-amber-600 font-bold">{dept.waitingQueue}</td>
                          <td className="py-3.5 px-4 text-purple-600 font-bold">{dept.waitingResponse}</td>
                          <td className="py-3.5 px-4 text-gray-600 font-medium">{dept.avgWait}</td>
                          <td className="py-3.5 px-4 text-gray-600 font-medium">{dept.avgService}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2.9 Chats por atendentes com a lista */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">
                        Chats por atendentes
                      </h3>
                      <p className="text-[12px] text-gray-500">Status dos consultores e volume em curso</p>
                    </div>
                  </div>
                  <EzTag label="Equipe" variant="gray" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 font-bold">Atendente</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Em andamento</th>
                        <th className="py-3 px-4 font-bold">Grupo de atendente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(data.chatsByAgent || [
                        { name: 'Alfredo Maia', status: 'online', inProgress: 3, group: 'Suporte N1' },
                        { name: 'Hermes Agent', status: 'busy', inProgress: 2, group: 'Automação' },
                        { name: 'Consultor DM', status: 'online', inProgress: 1, group: 'N2 Especialistas' },
                      ]).map((ag, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-[11px] border border-brand-200">
                              {ag.name.charAt(0)}
                            </span>
                            {ag.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                                ag.status === 'online' && 'bg-green-50 text-green-700 border-green-200',
                                ag.status === 'busy' && 'bg-amber-50 text-amber-700 border-amber-200',
                                ag.status === 'away' && 'bg-gray-50 text-gray-600 border-gray-200',
                                ag.status === 'offline' && 'bg-red-50 text-red-600 border-red-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  ag.status === 'online' && 'bg-green-500 animate-pulse',
                                  ag.status === 'busy' && 'bg-amber-500',
                                  ag.status === 'away' && 'bg-gray-400',
                                  ag.status === 'offline' && 'bg-red-500'
                                )}
                              />
                              {ag.status === 'online'
                                ? 'Ativo'
                                : ag.status === 'busy'
                                ? 'Ocupado'
                                : 'Ausente'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-blue-600 text-sm">{ag.inProgress}</td>
                          <td className="py-3.5 px-4 text-gray-600 font-medium">{ag.group}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECURSO */}
          {activeTab === 'recurso' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 3.6 Meus compromissos */}
                <TiFluxCard
                  icon={<Calendar className="w-5 h-5 text-brand-700" />}
                  title="Meus compromissos"
                  subtitle="Agendamentos atribuídos diretamente a você"
                  actions={
                    <SegmentedControl
                      options={[
                        { id: 'todos', label: 'Todos' },
                        { id: 'hoje', label: 'Hoje' },
                        { id: 'semana', label: 'Semana' },
                        { id: 'mes', label: 'Mês' },
                      ]}
                      value={myApptFilter}
                      onChange={(val) => setMyApptFilter(val as PeriodFilter)}
                    />
                  }
                >
                  <div className="space-y-3">
                    {(data.myAppointments?.items || [
                      {
                        id: '1',
                        title: 'Alinhamento de Chamado',
                        client: 'DM Tecnologia',
                        time: '14:00 - 15:00',
                        status: 'Confirmado',
                      },
                      {
                        id: '2',
                        title: 'Homologação de Parâmetros',
                        client: 'Refrigeração Mota',
                        time: '16:30 - 17:30',
                        status: 'Em breve',
                      },
                    ]).map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                          <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                            {item.client} • {item.time}
                          </span>
                        </div>
                        <EzBadge size="small" colorClass="bg-brand-50 text-brand-700 font-semibold">
                          {item.status}
                        </EzBadge>
                      </div>
                    ))}
                  </div>
                </TiFluxCard>

                {/* 3.7 Todos os compromissos */}
                <TiFluxCard
                  icon={<Briefcase className="w-5 h-5 text-brand-700" />}
                  title="Todos os compromissos"
                  subtitle="Agenda global da equipe de recursos técnicos"
                  actions={
                    <SegmentedControl
                      options={[
                        { id: 'todos', label: 'Todos' },
                        { id: 'hoje', label: 'Hoje' },
                        { id: 'semana', label: 'Semana' },
                        { id: 'mes', label: 'Mês' },
                      ]}
                      value={allApptFilter}
                      onChange={(val) => setAllApptFilter(val as PeriodFilter)}
                    />
                  }
                >
                  <div className="space-y-3">
                    {(data.allAppointments?.items || [
                      {
                        id: '1',
                        title: 'Alinhamento de Chamado',
                        client: 'DM Tecnologia',
                        time: '14:00 - 15:00',
                        status: 'Confirmado',
                        agent: 'Alfredo Maia',
                      },
                      {
                        id: '2',
                        title: 'Homologação de Parâmetros',
                        client: 'Refrigeração Mota',
                        time: '16:30 - 17:30',
                        status: 'Em breve',
                        agent: 'Consultor DM',
                      },
                      {
                        id: '3',
                        title: 'Treinamento de Equipe',
                        client: 'Agência Digital',
                        time: 'Amanhã 10:00',
                        status: 'Agendado',
                        agent: 'Alfredo Maia',
                      },
                    ]).map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                          <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                            {item.client} • {item.time} • <strong className="text-gray-800">{item.agent}</strong>
                          </span>
                        </div>
                        <EzBadge size="small" colorClass="bg-purple-50 text-purple-700 font-semibold">
                          {item.status}
                        </EzBadge>
                      </div>
                    ))}
                  </div>
                </TiFluxCard>
              </div>
            </div>
          )}

          {/* TAB 4: HORAS */}
          {activeTab === 'horas' && (
            <div className="space-y-6">
              {/* 2.5 Minhas horas apontadas */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold text-gray-900">
                        Minhas horas apontadas
                      </h2>
                      <p className="text-[13px] text-gray-500 mt-0.5">
                        Meta diária de 8H, horas apontadas e horas faltantes por dia do mês
                      </p>
                    </div>
                  </div>

                  {/* Resumo do Mês em Badges Padronizados */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-100 text-xs shadow-2xs">
                      <span className="text-brand-600 block text-[11px] font-bold uppercase tracking-wider">Horas Apontadas</span>
                      <strong className="text-[18px] text-brand-900 font-extrabold">{hoursLoggedTotal}H</strong>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-xs shadow-2xs">
                      <span className="text-amber-600 block text-[11px] font-bold uppercase tracking-wider">Horas Faltantes</span>
                      <strong className="text-[18px] text-amber-900 font-extrabold">{hoursRemainingTotal}H</strong>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs shadow-2xs">
                      <span className="text-gray-500 block text-[11px] font-bold uppercase tracking-wider">Meta Mensal</span>
                      <strong className="text-[18px] text-gray-800 font-extrabold">{hoursTargetTotal}H</strong>
                    </div>
                  </div>
                </div>

                {/* Legenda do gráfico */}
                <div className="flex items-center gap-6 text-xs text-gray-600 mb-4 pb-2 border-b border-gray-100 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-xs bg-brand-600" />
                    <span>Horas Apontadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-xs bg-amber-300" />
                    <span>Horas Faltantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1 bg-gray-400" />
                    <span>Meta Diária (8H)</span>
                  </div>
                </div>

                {/* Gráfico de Colunas Diárias do Mês */}
                <div className="relative pt-6 pb-2 overflow-x-auto no-scrollbar">
                  {/* Linha de referência da Meta de 8H */}
                  <div className="relative h-64 min-w-[720px] flex items-end justify-between gap-1.5 border-b border-gray-200">
                    <div className="absolute left-0 right-0 top-[20%] border-t border-dashed border-gray-300 pointer-events-none z-0">
                      <span className="absolute -top-3 left-0 text-[10px] text-gray-400 bg-white px-1 font-semibold">
                        Meta 8H
                      </span>
                    </div>

                    {monthlyDays.map((d) => {
                      const maxBarHeight = 10; // escala de 10h max
                      const loggedPct = Math.min(100, (d.loggedHours / maxBarHeight) * 100);
                      const remainingPct =
                        d.targetHours > d.loggedHours
                          ? Math.min(100, (d.remainingHours / maxBarHeight) * 100)
                          : 0;

                      return (
                        <div
                          key={d.day}
                          className="flex flex-col items-center flex-1 h-full justify-end group relative z-10"
                        >
                          {/* Tooltip Hover */}
                          <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap z-20 font-medium">
                            Dia {d.day}: {d.loggedHours}H apontadas ({d.remainingHours}H faltantes)
                          </div>

                          {/* Coluna composta com as três áreas */}
                          <div className="w-full max-w-[20px] bg-gray-100 rounded-t-md flex flex-col justify-end overflow-hidden h-[80%] border-t border-x border-gray-200/40">
                            {/* Área de Horas Faltantes (se meta > apontadas) */}
                            {remainingPct > 0 && (
                              <div
                                style={{ height: `${remainingPct}%` }}
                                className="w-full bg-amber-200 group-hover:bg-amber-300 transition-colors"
                              />
                            )}
                            {/* Área de Horas Apontadas */}
                            {loggedPct > 0 && (
                              <div
                                style={{ height: `${loggedPct}%` }}
                                className="w-full bg-brand-600 group-hover:bg-brand-700 transition-colors"
                              />
                            )}
                          </div>

                          {/* Rótulo do dia */}
                          <span className="text-[10px] text-gray-500 mt-2 font-semibold">
                            {d.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
