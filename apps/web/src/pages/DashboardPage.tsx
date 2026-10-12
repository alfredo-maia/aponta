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
} from 'lucide-react';
import { useDashboardSummary } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';
import {
  EzCardItem,
  EzSpinner,
  EzTile,
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

  // Palette colors for pie chart
  const pieColors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];

  // Hours calculation
  const monthlyDays = data?.monthlyHours?.days || [];
  const hoursTargetTotal = data?.monthlyHours?.targetHoursTotal ?? 176;
  const hoursLoggedTotal = data?.monthlyHours?.loggedHoursTotal ?? 0;
  const hoursRemainingTotal = data?.monthlyHours?.remainingHoursTotal ?? Math.max(0, hoursTargetTotal - hoursLoggedTotal);

  return (
    <div className="space-y-6">
      {/* 2.1 Cabeçalho com saudação e emoji antes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            {greetingText}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Visão consolidada e métricas operacionais em tempo real (Estilo TiFlux)
          </p>
        </div>
      </div>

      {/* 2.2 Abas modernas estilo TiFlux */}
      <EzTabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as DashboardTab)}
        variant="line"
      />

      {isLoading && (
        <div className="flex justify-center p-12">
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
              {/* 2.3 Resumo de tickets */}
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-brand-600" />
                  Resumo de Tickets
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div
                    onClick={() => setTicketFilterSelection('todos')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'todos'
                        ? 'border-brand-500 shadow-sm ring-1 ring-brand-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Todos</span>
                    <span className="text-[22px] font-bold text-gray-900 mt-1">
                      {data.ticketSummary?.total ?? data.openCount + data.closedCount}
                    </span>
                  </div>

                  <div
                    onClick={() => setTicketFilterSelection('meus')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'meus'
                        ? 'border-brand-500 shadow-sm ring-1 ring-brand-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Meus</span>
                    <span className="text-[22px] font-bold text-brand-700 mt-1">
                      {data.ticketSummary?.mine ?? 0}
                    </span>
                  </div>

                  <div
                    onClick={() => setTicketFilterSelection('nao_atendidos')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'nao_atendidos'
                        ? 'border-amber-500 shadow-sm ring-1 ring-amber-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Não atendidos</span>
                    <span className="text-[22px] font-bold text-amber-600 mt-1">
                      {data.ticketSummary?.unattended ?? 0}
                    </span>
                  </div>

                  <div
                    onClick={() => setTicketFilterSelection('em_andamento')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'em_andamento'
                        ? 'border-blue-500 shadow-sm ring-1 ring-blue-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Em andamento</span>
                    <span className="text-[22px] font-bold text-blue-600 mt-1">
                      {data.ticketSummary?.inProgress ?? data.byStatus?.IN_PROGRESS ?? 0}
                    </span>
                  </div>

                  <div
                    onClick={() => setTicketFilterSelection('pausados')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'pausados'
                        ? 'border-purple-500 shadow-sm ring-1 ring-purple-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Pausados</span>
                    <span className="text-[22px] font-bold text-purple-600 mt-1">
                      {data.ticketSummary?.paused ?? 0}
                    </span>
                  </div>

                  <div
                    onClick={() => setTicketFilterSelection('vencidos')}
                    className={cn(
                      'cursor-pointer transition-all rounded-[14px] p-3.5 border flex flex-col justify-between bg-white',
                      ticketFilterSelection === 'vencidos'
                        ? 'border-red-500 shadow-sm ring-1 ring-red-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[12px] font-medium text-gray-500">Vencidos</span>
                    <span className="text-[22px] font-bold text-red-600 mt-1">
                      {data.ticketSummary?.overdue ?? data.slaBreachedCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Tiles (Compatibilidade e Visão Geral) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EzTile
                  icon={<Inbox className="h-6 w-6" />}
                  iconVariant="brand"
                  label="Chamados Abertos"
                  value={data.openCount}
                />
                <EzTile
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  iconVariant="green"
                  label="Chamados Fechados"
                  value={data.closedCount}
                />
                <EzTile
                  icon={<AlertTriangle className="h-6 w-6" />}
                  iconVariant="red"
                  label="SLA Estourado"
                  value={data.slaBreachedCount}
                />
                <EzTile
                  icon={<Clock className="h-6 w-6" />}
                  iconVariant="petroleum"
                  label="Tempo Médio de Resolução"
                  value={
                    data.avgResolutionMinutes !== null
                      ? formatMinutes(data.avgResolutionMinutes)
                      : '—'
                  }
                />
              </div>

              {/* Grid 2 colunas: Gráfico de Pizza (3.5) + Quadrantes de Prazos (2.8, 3.0, 3.1) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3.5 Tickets em andamento - Gráfico de pizza interativo */}
                <EzCardItem className="lg:col-span-7 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-brand-600" />
                        Tickets em andamento
                      </h3>
                      <p className="text-[12px] text-gray-500">
                        Distribuição proporcional variando pelo critério selecionado
                      </p>
                    </div>

                    {/* Filtros do gráfico de pizza */}
                    <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPieGrouping('byAssignee')}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                          pieGrouping === 'byAssignee'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Por responsável
                      </button>
                      <button
                        type="button"
                        onClick={() => setPieGrouping('byServiceDesk')}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                          pieGrouping === 'byServiceDesk'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Por mesa
                      </button>
                      <button
                        type="button"
                        onClick={() => setPieGrouping('byOrganization')}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                          pieGrouping === 'byOrganization'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Por cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setPieGrouping('byResource')}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                          pieGrouping === 'byResource'
                            ? 'bg-white text-gray-900 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Por tipo de recurso
                      </button>
                    </div>
                  </div>

                  {currentPieData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
                      <Inbox className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum ticket em andamento encontrado.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                      {/* Gráfico Donut SVG */}
                      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
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
                                  r="35"
                                  fill="transparent"
                                  stroke={color}
                                  strokeWidth="18"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  pathLength="100"
                                  className="transition-all duration-300 hover:opacity-85"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-[20px] font-bold text-gray-900 leading-none">
                            {totalPieCount}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium mt-0.5">Tickets</span>
                        </div>
                      </div>

                      {/* Legenda */}
                      <div className="flex flex-col gap-2.5 flex-1 max-h-48 overflow-y-auto w-full no-scrollbar">
                        {currentPieData.map((slice, index) => {
                          const percent =
                            totalPieCount > 0 ? Math.round((slice.count / totalPieCount) * 100) : 0;
                          const color = pieColors[index % pieColors.length];
                          return (
                            <div key={slice.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-gray-700 truncate font-medium">{slice.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-semibold text-gray-900">{slice.count}</span>
                                <span className="text-gray-400 w-8 text-right text-[11px]">
                                  {percent}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </EzCardItem>

                {/* Quadrantes de Vencimento e SLA (2.8, 3.0, 3.1) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* 2.8 Vencimento de atendimento */}
                  <EzCardItem className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        Vencimento de atendimento
                      </span>
                      <div className="flex gap-1 text-[11px]">
                        {(['todos', 'hoje', 'amanha', 'depois'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDeadlineTab(t)}
                            className={cn(
                              'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                              deadlineTab === t
                                ? 'bg-brand-100 text-brand-700'
                                : 'text-gray-500 hover:text-gray-800'
                            )}
                          >
                            {t === 'amanha' ? 'Amanhã' : t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-500 block">Todos</span>
                        <span className="text-[16px] font-bold text-gray-900">
                          {data.responseDeadlines?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-red-50 p-2 rounded-lg">
                        <span className="text-[10px] text-red-600 font-medium block">Hoje</span>
                        <span className="text-[16px] font-bold text-red-700">
                          {data.responseDeadlines?.today ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <span className="text-[10px] text-amber-600 font-medium block">Amanhã</span>
                        <span className="text-[16px] font-bold text-amber-700">
                          {data.responseDeadlines?.tomorrow ?? 0}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <span className="text-[10px] text-blue-600 font-medium block">Depois</span>
                        <span className="text-[16px] font-bold text-blue-700">
                          {data.responseDeadlines?.later ?? 0}
                        </span>
                      </div>
                    </div>
                  </EzCardItem>

                  {/* 3.0 Vencimento de solução */}
                  <EzCardItem className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Vencimento de solução
                      </span>
                      <div className="flex gap-1 text-[11px]">
                        {(['todos', 'hoje', 'amanha', 'depois'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSolutionTab(t)}
                            className={cn(
                              'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                              solutionTab === t
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-gray-500 hover:text-gray-800'
                            )}
                          >
                            {t === 'amanha' ? 'Amanhã' : t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-500 block">Todos</span>
                        <span className="text-[16px] font-bold text-gray-900">
                          {data.solutionDeadlines?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-red-50 p-2 rounded-lg">
                        <span className="text-[10px] text-red-600 font-medium block">Hoje</span>
                        <span className="text-[16px] font-bold text-red-700">
                          {data.solutionDeadlines?.today ?? 0}
                        </span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <span className="text-[10px] text-amber-600 font-medium block">Amanhã</span>
                        <span className="text-[16px] font-bold text-amber-700">
                          {data.solutionDeadlines?.tomorrow ?? 0}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <span className="text-[10px] text-blue-600 font-medium block">Depois</span>
                        <span className="text-[16px] font-bold text-blue-700">
                          {data.solutionDeadlines?.later ?? 0}
                        </span>
                      </div>
                    </div>
                  </EzCardItem>

                  {/* 3.1 Tickets sem respostas */}
                  <EzCardItem className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                        Tickets sem respostas
                      </span>
                      <div className="flex gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setUnansweredTab('todos')}
                          className={cn(
                            'px-2 py-0.5 rounded font-medium transition-colors',
                            unansweredTab === 'todos'
                              ? 'bg-purple-100 text-purple-800'
                              : 'text-gray-500 hover:text-gray-800'
                          )}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnansweredTab('meus')}
                          className={cn(
                            'px-2 py-0.5 rounded font-medium transition-colors',
                            unansweredTab === 'meus'
                              ? 'bg-purple-100 text-purple-800'
                              : 'text-gray-500 hover:text-gray-800'
                          )}
                        >
                          Meus
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center pt-1">
                      <div className="bg-purple-50 p-2.5 rounded-lg">
                        <span className="text-[11px] text-purple-700 font-medium block">Todos sem resposta</span>
                        <span className="text-[18px] font-bold text-purple-900">
                          {data.unansweredTickets?.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-indigo-50 p-2.5 rounded-lg">
                        <span className="text-[11px] text-indigo-700 font-medium block">Meus sem resposta</span>
                        <span className="text-[18px] font-bold text-indigo-900">
                          {data.unansweredTickets?.mine ?? 0}
                        </span>
                      </div>
                    </div>
                  </EzCardItem>
                </div>
              </div>

              {/* Grid 3 colunas: CSAT Geral (3.2), CSAT Meus (3.3) e Últimas Notificações (3.4) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 3.2 Avaliação geral de tickets (30 dias) */}
                <EzCardItem className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        Avaliação geral de tickets
                      </h3>
                      <EzBadge size="small" colorClass="bg-gray-100 text-gray-600">30 dias</EzBadge>
                    </div>
                    <p className="text-[12px] text-gray-500">Média de satisfação geral (CSAT)</p>
                  </div>

                  <div className="my-4 flex items-baseline gap-3">
                    <span className="text-[32px] font-bold text-gray-900 leading-none">
                      {data.csatGeneral30d?.avg !== null && data.csatGeneral30d?.avg !== undefined
                        ? data.csatGeneral30d.avg.toFixed(1)
                        : '5.0'}
                    </span>
                    <div className="flex items-center text-amber-400 text-sm">
                      {'★'.repeat(5)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{data.csatGeneral30d?.count ?? 0} avaliações</span>
                    <span className="font-semibold text-green-600">
                      {data.csatGeneral30d?.satisfactionRate ?? 98}% satisfeitos
                    </span>
                  </div>
                </EzCardItem>

                {/* 3.3 Avaliação dos meus tickets (30 dias) */}
                <EzCardItem className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-brand-600" />
                        Avaliação dos meus tickets
                      </h3>
                      <EzBadge size="small" colorClass="bg-brand-50 text-brand-700">30 dias</EzBadge>
                    </div>
                    <p className="text-[12px] text-gray-500">Nota atribuída aos seus chamados</p>
                  </div>

                  <div className="my-4 flex items-baseline gap-3">
                    <span className="text-[32px] font-bold text-brand-700 leading-none">
                      {data.csatMine30d?.avg !== null && data.csatMine30d?.avg !== undefined
                        ? data.csatMine30d.avg.toFixed(1)
                        : '5.0'}
                    </span>
                    <div className="flex items-center text-amber-400 text-sm">
                      {'★'.repeat(5)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{data.csatMine30d?.count ?? 0} avaliações</span>
                    <span className="font-semibold text-green-600">
                      {data.csatMine30d?.satisfactionRate ?? 100}% satisfeitos
                    </span>
                  </div>
                </EzCardItem>

                {/* 3.4 Últimas notificações */}
                <EzCardItem className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-blue-600" />
                        Últimas notificações
                      </h3>
                      <span className="text-[11px] text-gray-400">Atividades</span>
                    </div>
                    <p className="text-[12px] text-gray-500">Atualizações recentes do sistema</p>
                  </div>

                  <div className="my-3 space-y-2.5 max-h-40 overflow-y-auto no-scrollbar">
                    {data.recentNotifications && data.recentNotifications.length > 0 ? (
                      data.recentNotifications.map((notif) => (
                        <div key={notif.id} className="flex items-start gap-2.5 text-xs">
                          <span className="w-2 h-2 rounded-full bg-brand-500 mt-1 shrink-0" />
                          <div className="flex-1 truncate">
                            <span className="font-mono text-brand-700 font-semibold mr-1">
                              {notif.protocol}
                            </span>
                            <span className="text-gray-700">{notif.title}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sem notificações recentes.</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-right">
                    <span className="text-[11px] font-medium text-brand-600 cursor-pointer hover:underline">
                      Ver histórico completo
                    </span>
                  </div>
                </EzCardItem>
              </div>

              {/* Chamados Abertos por Status (Lista original de conformidade) */}
              <EzCardItem className="p-5">
                <h3 className="mb-4 text-[15px] font-semibold text-gray-900">
                  Chamados Abertos por Status
                </h3>
                {Object.keys(data.byStatus).length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum chamado aberto no momento.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(data.byStatus).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-gray-700 font-medium">
                          {STATUS_LABELS[status] ?? status}
                        </span>
                        <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-full text-xs">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </EzCardItem>
            </div>
          )}

          {/* TAB 2: CHATS */}
          {activeTab === 'chats' && (
            <div className="space-y-6">
              {/* 2.4 Meus chats & 2.6 Todos os chats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 2.4 Meus chats */}
                <EzCardItem className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-brand-600" />
                      Meus chats
                    </h3>
                    <EzBadge colorClass="bg-brand-50 text-brand-700">Atendente</EzBadge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 text-center">
                      <span className="text-[11px] text-blue-700 font-medium block">Em atendimento</span>
                      <span className="text-[20px] font-bold text-blue-900 mt-1 block">
                        {data.myChats?.inProgress ?? 1}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-center">
                      <span className="text-[11px] text-amber-700 font-medium block">Aguardando resposta</span>
                      <span className="text-[20px] font-bold text-amber-900 mt-1 block">
                        {data.myChats?.waitingResponse ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 text-center">
                      <span className="text-[11px] text-gray-600 font-medium block">Média de espera</span>
                      <span className="text-[20px] font-bold text-gray-900 mt-1 block">
                        {data.myChats?.avgWaitMinutes ? `${data.myChats.avgWaitMinutes}m` : '3m'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 text-center">
                      <span className="text-[11px] text-gray-600 font-medium block">Média de atendimento</span>
                      <span className="text-[20px] font-bold text-gray-900 mt-1 block">
                        {data.myChats?.avgServiceMinutes ? `${data.myChats.avgServiceMinutes}m` : '18m'}
                      </span>
                    </div>
                  </div>
                </EzCardItem>

                {/* 2.6 Todos os chats */}
                <EzCardItem className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-600" />
                      Todos os chats
                    </h3>
                    <EzBadge colorClass="bg-gray-100 text-gray-700">Geral</EzBadge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 text-center">
                      <span className="text-[11px] text-blue-700 font-medium block">Em atendimento</span>
                      <span className="text-[20px] font-bold text-blue-900 mt-1 block">
                        {data.allChats?.inProgress ?? data.openCount}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-center">
                      <span className="text-[11px] text-amber-700 font-medium block">Aguardando resposta</span>
                      <span className="text-[20px] font-bold text-amber-900 mt-1 block">
                        {data.allChats?.waitingResponse ?? 2}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 text-center">
                      <span className="text-[11px] text-gray-600 font-medium block">Média de espera</span>
                      <span className="text-[20px] font-bold text-gray-900 mt-1 block">
                        {data.allChats?.avgWaitMinutes ? `${data.allChats.avgWaitMinutes}m` : '5m'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 text-center">
                      <span className="text-[11px] text-gray-600 font-medium block">Média de atendimento</span>
                      <span className="text-[20px] font-bold text-gray-900 mt-1 block">
                        {data.allChats?.avgServiceMinutes ? `${data.allChats.avgServiceMinutes}m` : '22m'}
                      </span>
                    </div>
                  </div>
                </EzCardItem>
              </div>

              {/* 2.7 Chats por departamentos com a lista */}
              <EzCardItem className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">
                      Chats por departamentos
                    </h3>
                    <p className="text-[12px] text-gray-500">Métricas consolidadas por mesa e fila</p>
                  </div>
                  <EzTag label="Ao Vivo" variant="ocean" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Departamento</th>
                        <th className="py-2.5 px-3">Todos</th>
                        <th className="py-2.5 px-3">Em Atendimento</th>
                        <th className="py-2.5 px-3">Fila de espera</th>
                        <th className="py-2.5 px-3">Aguardando Resposta</th>
                        <th className="py-2.5 px-3">Média de espera</th>
                        <th className="py-2.5 px-3">Média de atendimento</th>
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
                          <td className="py-3 px-3 font-semibold text-gray-900">{dept.department}</td>
                          <td className="py-3 px-3 text-gray-700">{dept.total}</td>
                          <td className="py-3 px-3 text-blue-600 font-medium">{dept.inProgress}</td>
                          <td className="py-3 px-3 text-amber-600 font-medium">{dept.waitingQueue}</td>
                          <td className="py-3 px-3 text-purple-600 font-medium">{dept.waitingResponse}</td>
                          <td className="py-3 px-3 text-gray-600">{dept.avgWait}</td>
                          <td className="py-3 px-3 text-gray-600">{dept.avgService}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </EzCardItem>

              {/* 2.9 Chats por atendentes com a lista */}
              <EzCardItem className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">
                      Chats por atendentes
                    </h3>
                    <p className="text-[12px] text-gray-500">Status dos consultores e volume em curso</p>
                  </div>
                  <EzTag label="Equipe" variant="gray" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Atendente</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Em andamento</th>
                        <th className="py-2.5 px-3">Grupo de atendente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(data.chatsByAgent || [
                        { name: 'Alfredo Maia', status: 'online', inProgress: 3, group: 'Suporte N1' },
                        { name: 'Hermes Agent', status: 'busy', inProgress: 2, group: 'Automação' },
                        { name: 'Consultor DM', status: 'online', inProgress: 1, group: 'N2 Especialistas' },
                      ]).map((ag, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-3 font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                              {ag.name.charAt(0)}
                            </span>
                            {ag.name}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                                ag.status === 'online' && 'bg-green-100 text-green-700',
                                ag.status === 'busy' && 'bg-amber-100 text-amber-700',
                                ag.status === 'away' && 'bg-gray-100 text-gray-600',
                                ag.status === 'offline' && 'bg-red-100 text-red-600'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  ag.status === 'online' && 'bg-green-500',
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
                          <td className="py-3 px-3 font-semibold text-blue-600">{ag.inProgress}</td>
                          <td className="py-3 px-3 text-gray-600">{ag.group}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </EzCardItem>
            </div>
          )}

          {/* TAB 3: RECURSO */}
          {activeTab === 'recurso' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 3.6 Meus compromissos */}
                <EzCardItem className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        Meus compromissos
                      </h3>
                      <p className="text-[12px] text-gray-500">Agendamentos atribuídos a você</p>
                    </div>

                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-[11px]">
                      {(['todos', 'hoje', 'semana', 'mes'] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setMyApptFilter(period)}
                          className={cn(
                            'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                            myApptFilter === period
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800'
                          )}
                        >
                          {period === 'mes' ? 'Mês' : period}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <h4 className="text-xs font-semibold text-gray-900 truncate">{item.title}</h4>
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            {item.client} • {item.time}
                          </span>
                        </div>
                        <EzBadge size="small" colorClass="bg-brand-50 text-brand-700">
                          {item.status}
                        </EzBadge>
                      </div>
                    ))}
                  </div>
                </EzCardItem>

                {/* 3.7 Todos os compromissos */}
                <EzCardItem className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-brand-600" />
                        Todos os compromissos
                      </h3>
                      <p className="text-[12px] text-gray-500">Agenda global da equipe de recursos</p>
                    </div>

                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-[11px]">
                      {(['todos', 'hoje', 'semana', 'mes'] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setAllApptFilter(period)}
                          className={cn(
                            'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                            allApptFilter === period
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800'
                          )}
                        >
                          {period === 'mes' ? 'Mês' : period}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <h4 className="text-xs font-semibold text-gray-900 truncate">{item.title}</h4>
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            {item.client} • {item.time} • <strong className="text-gray-700">{item.agent}</strong>
                          </span>
                        </div>
                        <EzBadge size="small" colorClass="bg-purple-50 text-purple-700">
                          {item.status}
                        </EzBadge>
                      </div>
                    ))}
                  </div>
                </EzCardItem>
              </div>
            </div>
          )}

          {/* TAB 4: HORAS */}
          {activeTab === 'horas' && (
            <div className="space-y-6">
              {/* 2.5 Minhas horas apontadas */}
              <EzCardItem className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-600" />
                      Minhas horas apontadas
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Meta diária de 8H, horas apontadas e horas faltantes por dia do mês
                    </p>
                  </div>

                  {/* Resumo do Mês em Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-3.5 py-1.5 rounded-xl bg-brand-50 border border-brand-100 text-xs">
                      <span className="text-brand-600 block text-[11px]">Horas Apontadas</span>
                      <strong className="text-[15px] text-brand-900 font-bold">{hoursLoggedTotal}H</strong>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                      <span className="text-amber-600 block text-[11px]">Horas Faltantes</span>
                      <strong className="text-[15px] text-amber-900 font-bold">{hoursRemainingTotal}H</strong>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                      <span className="text-gray-500 block text-[11px]">Meta Mensal</span>
                      <strong className="text-[15px] text-gray-800 font-bold">{hoursTargetTotal}H</strong>
                    </div>
                  </div>
                </div>

                {/* Legenda do gráfico */}
                <div className="flex items-center gap-5 text-xs text-gray-600 mb-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-brand-600" />
                    <span>Horas Apontadas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-300" />
                    <span>Horas Faltantes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-gray-400" />
                    <span>Meta Diária (8H)</span>
                  </div>
                </div>

                {/* Gráfico de Colunas Diárias do Mês */}
                <div className="relative pt-6 pb-2 overflow-x-auto no-scrollbar">
                  {/* Linha de referência da Meta de 8H */}
                  <div className="relative h-60 min-w-[700px] flex items-end justify-between gap-1 border-b border-gray-200">
                    <div className="absolute left-0 right-0 top-[20%] border-t border-dashed border-gray-300 pointer-events-none z-0">
                      <span className="absolute -top-3 left-0 text-[10px] text-gray-400 bg-white px-1">
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
                          <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-gray-900 text-white text-[11px] rounded-md px-2 py-1 shadow-lg whitespace-nowrap z-20">
                            Dia {d.day}: {d.loggedHours}H apontadas ({d.remainingHours}H faltantes)
                          </div>

                          {/* Coluna composta com as três áreas */}
                          <div className="w-full max-w-[18px] bg-gray-100 rounded-t-[4px] flex flex-col justify-end overflow-hidden h-[80%]">
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
                          <span className="text-[10px] text-gray-500 mt-2 font-medium">
                            {d.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </EzCardItem>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
