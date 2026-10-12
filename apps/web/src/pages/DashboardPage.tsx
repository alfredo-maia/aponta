import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Briefcase,
  Calendar,
  Clock,
  Headset,
  Hourglass,
  Inbox,
  MessageSquare,
  MessageSquareDot,
  Monitor,
  PauseCircle,
  Star,
  Ticket,
  Timer,
  UserCheck,
  UserCircle2,
  Users,
} from 'lucide-react';
import { useDashboardSummary } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';
import { EzSpinner, EzTabs, EzActionsButton } from '../components/ds';
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

// TiFlux-style palette used for both the pie chart slices and the legend avatars.
const CHART_COLORS = ['#f59e0b', '#14b8a6', '#6366f1', '#fb923c', '#0d9488', '#10b981', '#0ea5e9', '#ec4899'];

function formatHoursAsClock(hours: number) {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

type DashboardTab = 'tickets' | 'chats' | 'recurso' | 'horas';
type PieGrouping = 'byAssignee' | 'byServiceDesk' | 'byOrganization' | 'byResource';

/**
 * Plain, flat TiFlux-style card: white background, thin gray border, a bold
 * gray title, and an optional sub-tab row that supplies its own bottom rule.
 * No icon badges, subtitles or accent bars — the real product is far flatter
 * than a typical "modern SaaS" card.
 */
interface TiFluxCardProps {
  title: string;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function TiFluxCard({ title, tabs, children, className, bodyClassName }: TiFluxCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)} data-testid={`card-${slugify(title)}`}>
      <div className={cn('px-5 pt-4', !tabs && 'pb-3 border-b border-gray-100')}>
        <h3 className="text-[15px] font-bold text-gray-700">{title}</h3>
      </div>
      {tabs && <div className="px-5">{tabs}</div>}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  );
}

/** A row of label-over-icon+number groups — the KPI style used throughout TiFlux. */
interface KpiItem {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  colorClass: string;
}

function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1.5">
          <span className="text-[12px] text-gray-500 font-medium">{item.label}</span>
          <span className={cn('flex items-center gap-1.5 text-[19px] font-bold leading-none', item.colorClass)}>
            {item.icon}
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** TiFlux's empty-state treatment: a faint envelope/inbox icon and "Não há dados". */
function EmptyState({ label = 'Não há dados' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Inbox className="w-9 h-9 mb-2 text-gray-200" strokeWidth={1.25} />
      <p className="text-[13px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="py-3 px-4 font-bold text-gray-600">
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
      </span>
    </th>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

/** A real (non-donut) pie chart with a scrollable, avatar-style legend. */
function TicketsPieChart({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  if (data.length === 0) {
    return <EmptyState label="Nenhum ticket em andamento encontrado." />;
  }

  let cumulativeAngle = 0;
  const slices = data.map((item, index) => {
    const percent = total > 0 ? item.count / total : 0;
    const startAngle = cumulativeAngle;
    cumulativeAngle += percent * 360;
    return {
      ...item,
      startAngle,
      endAngle: cumulativeAngle,
      percent,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <svg viewBox="0 0 100 100" className="w-52 h-52 shrink-0" role="img" aria-label="Tickets em andamento por categoria">
        {slices.length === 1 ? (
          <circle cx="50" cy="50" r="46" fill={slices[0].color} />
        ) : (
          slices.map((s) => (
            <path key={s.name} d={pieSlicePath(50, 50, 46, s.startAngle, s.endAngle)} fill={s.color} stroke="#ffffff" strokeWidth="0.75" />
          ))
        )}
        {slices.map((s) => {
          if (s.percent < 0.04) return null;
          const pos = polarToCartesian(50, 50, 28, (s.startAngle + s.endAngle) / 2);
          return (
            <text
              key={`label-${s.name}`}
              x={pos.x}
              y={pos.y}
              fontSize="7"
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {s.count}
            </text>
          );
        })}
      </svg>

      <div className="flex flex-col divide-y divide-gray-100 w-full max-h-64 overflow-y-auto no-scrollbar">
        {slices.map((s) => (
          <div key={s.name} className="flex items-center gap-3 py-2.5">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
              style={{ backgroundColor: s.color }}
            >
              {s.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
              <p className="text-[12px] text-gray-500">Tickets {s.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A small multi-series SVG line chart (no smoothing, just straight segments). */
interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

function LineChart({ series, xLabels, height = 220 }: { series: LineSeries[]; xLabels: string[]; height?: number }) {
  const n = xLabels.length;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));

  const toPoints = (values: number[]) =>
    values
      .map((v, i) => {
        const x = n > 1 ? (i / (n - 1)) * 100 : 50;
        const y = 100 - (v / maxVal) * 92;
        return `${x},${y}`;
      })
      .join(' ');

  const labelStep = Math.max(1, Math.ceil(n / 7));

  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-[12px] text-gray-600 font-medium">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Gráfico de linha">
        {[0, 25, 50, 75, 100].map((gy) => (
          <line key={gy} x1="0" x2="100" y1={gy} y2={gy} stroke="#f1f5f9" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={toPoints(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
        {xLabels.map((l, i) => (
          <span key={`${l}-${i}`} className={cn(i % labelStep !== 0 && i !== n - 1 && 'invisible')}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<string | number>('tickets');
  const [pieGrouping, setPieGrouping] = useState<PieGrouping>('byAssignee');

  const greetingName = useMemo(() => {
    const raw = user?.email ? user.email.split('@')[0] : 'Usuário';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [user?.email]);

  const tabsConfig = useMemo(
    () => [
      { id: 'tickets', label: 'Tickets' },
      { id: 'chats', label: 'Chats' },
      { id: 'recurso', label: 'Recurso' },
      { id: 'horas', label: 'Horas' },
    ],
    [],
  );

  const pieData = useMemo(() => {
    if (!data?.inProgressBreakdown) return [];
    return (data.inProgressBreakdown[pieGrouping] || []).filter((i) => i.count > 0);
  }, [data?.inProgressBreakdown, pieGrouping]);

  const monthlyDays = useMemo(() => data?.monthlyHours?.days || [], [data?.monthlyHours?.days]);
  const hoursTargetTotal = data?.monthlyHours?.targetHoursTotal ?? 0;
  const hoursLoggedTotal = data?.monthlyHours?.loggedHoursTotal ?? 0;
  const hoursRemainingTotal = data?.monthlyHours?.remainingHoursTotal ?? Math.max(0, hoursTargetTotal - hoursLoggedTotal);

  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(new Date(Date.now() - 86400000));
  const todayHours = monthlyDays.find((d) => d.date === todayKey)?.loggedHours ?? 0;
  const yesterdayHours = monthlyDays.find((d) => d.date === yesterdayKey)?.loggedHours ?? 0;

  const weekDays = useMemo(() => monthlyDays.filter((d) => d.date <= todayKey).slice(-7), [monthlyDays, todayKey]);

  const trend30d = data?.ticketsTrend30d || [];

  return (
    <div className="space-y-5">
      {/* Header: mascot icon + greeting, Modo TV, Ações — a plain row, not a bordered banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Headset className="w-5 h-5 text-gray-700" />
          <h1 className="text-[15px] text-gray-700 font-medium">
            Bom te ver de volta, {greetingName}
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <span
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 font-medium cursor-not-allowed select-none"
            title="Em breve"
          >
            <Monitor className="w-4 h-4" />
            Modo TV
          </span>
          <EzActionsButton
            label="Ações"
            align="right"
            className="bg-brand-600 text-white border-brand-600 hover:bg-brand-700 h-[38px] rounded-lg"
            actions={[
              {
                label: 'Novo Ticket',
                onClick: () => {
                  window.location.href = '/tickets/new';
                },
              },
            ]}
          />
        </div>
      </div>

      {/* Plain-text tab row, teal underline on the active tab */}
      <EzTabs tabs={tabsConfig} activeTab={activeTab} onChange={(tabId) => setActiveTab(tabId as DashboardTab)} variant="line" />

      {isLoading && (
        <div className="flex justify-center p-12 bg-white rounded-xl border border-gray-200">
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
          {/* TAB: TICKETS */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TiFluxCard title="Resumo de tickets">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.ticketSummary?.total ?? data.openCount + data.closedCount,
                      icon: <Ticket className="w-[18px] h-[18px]" />,
                      colorClass: 'text-teal-600',
                    },
                    {
                      label: 'Meus',
                      value: data.ticketSummary?.mine ?? 0,
                      icon: <UserCheck className="w-[18px] h-[18px]" />,
                      colorClass: 'text-teal-600',
                    },
                    {
                      label: 'Não atendidos',
                      value: data.ticketSummary?.unattended ?? 0,
                      icon: <MessageSquareDot className="w-[18px] h-[18px]" />,
                      colorClass: 'text-blue-600',
                    },
                    {
                      label: 'Em andamento',
                      value: data.ticketSummary?.inProgress ?? data.byStatus?.IN_PROGRESS ?? 0,
                      icon: <Activity className="w-[18px] h-[18px]" />,
                      colorClass: 'text-green-600',
                    },
                    {
                      label: 'Pausados',
                      value: data.ticketSummary?.paused ?? 0,
                      icon: <PauseCircle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                    {
                      label: 'Vencidos',
                      value: data.ticketSummary?.overdue ?? data.slaBreachedCount,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-red-600',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard
                title="Minhas horas apontadas"
                className="lg:row-span-2"
                bodyClassName="p-5 flex flex-col"
              >
                <div className="flex items-center gap-10 mb-5">
                  <div>
                    <span className="text-[12px] text-gray-500 font-medium block mb-1">Ontem</span>
                    <span className="flex items-center gap-1.5 text-[19px] font-bold text-teal-600">
                      <UserCheck className="w-[18px] h-[18px]" />
                      {formatHoursAsClock(yesterdayHours)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-gray-500 font-medium block mb-1">Hoje</span>
                    <span className="flex items-center gap-1.5 text-[19px] font-bold text-amber-500">
                      <Clock className="w-[18px] h-[18px]" />
                      {formatHoursAsClock(todayHours)}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-500">
                    <span>
                      Apontadas <strong className="text-gray-700">{hoursLoggedTotal}H</strong>
                    </span>
                    <span>
                      Faltantes <strong className="text-gray-700">{hoursRemainingTotal}H</strong>
                    </span>
                    <span>
                      Meta <strong className="text-gray-700">{hoursTargetTotal}H</strong>
                    </span>
                  </div>
                </div>

                {weekDays.length === 0 ? (
                  <EmptyState />
                ) : (
                  <LineChart
                    series={[{ name: 'Horas apontadas', color: '#008561', values: weekDays.map((d) => d.loggedHours) }]}
                    xLabels={weekDays.map((d) => formatDateLabel(d.date))}
                  />
                )}
              </TiFluxCard>

              <TiFluxCard
                title="Tickets em andamento"
                className="lg:col-span-1"
                tabs={
                  <EzTabs
                    tabs={[
                      { id: 'byAssignee', label: 'Por responsável' },
                      { id: 'byServiceDesk', label: 'Por mesa' },
                      { id: 'byOrganization', label: 'Por cliente' },
                      { id: 'byResource', label: 'Por tipo de recurso' },
                    ]}
                    activeTab={pieGrouping}
                    onChange={(val) => setPieGrouping(val as PieGrouping)}
                    variant="line"
                  />
                }
              >
                <TicketsPieChart data={pieData} />
              </TiFluxCard>

              <TiFluxCard title="Vencimento de atendimento">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.responseDeadlines?.total ?? 0,
                      icon: <Timer className="w-[18px] h-[18px]" />,
                      colorClass: 'text-gray-600',
                    },
                    {
                      label: 'Hoje',
                      value: data.responseDeadlines?.today ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                    {
                      label: 'Amanhã',
                      value: data.responseDeadlines?.tomorrow ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-indigo-500',
                    },
                    {
                      label: 'Depois',
                      value: data.responseDeadlines?.later ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-emerald-500',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard title="Vencimento de solução">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.solutionDeadlines?.total ?? 0,
                      icon: <Timer className="w-[18px] h-[18px]" />,
                      colorClass: 'text-gray-600',
                    },
                    {
                      label: 'Hoje',
                      value: data.solutionDeadlines?.today ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                    {
                      label: 'Amanhã',
                      value: data.solutionDeadlines?.tomorrow ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-indigo-500',
                    },
                    {
                      label: 'Depois',
                      value: data.solutionDeadlines?.later ?? 0,
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      colorClass: 'text-emerald-500',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard title="Tickets sem respostas">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.unansweredTickets?.total ?? 0,
                      icon: <MessageSquareDot className="w-[18px] h-[18px]" />,
                      colorClass: 'text-teal-600',
                    },
                    {
                      label: 'Meus',
                      value: data.unansweredTickets?.mine ?? 0,
                      icon: <UserCircle2 className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard title="Avaliação geral de tickets (30 dias)">
                {!data.csatGeneral30d || data.csatGeneral30d.count === 0 ? (
                  <EmptyState />
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[30px] font-black text-gray-900 leading-none">
                        {data.csatGeneral30d.avg?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-amber-400 text-sm">
                        <Star className="w-4 h-4 inline fill-amber-400" />
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500">
                      {data.csatGeneral30d.count} avaliações · {data.csatGeneral30d.satisfactionRate ?? 0}% satisfeitos
                    </p>
                  </div>
                )}
              </TiFluxCard>

              <TiFluxCard title="Avaliação dos meus tickets (30 dias)">
                {!data.csatMine30d || data.csatMine30d.count === 0 ? (
                  <EmptyState />
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[30px] font-black text-gray-900 leading-none">
                        {data.csatMine30d.avg?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-amber-400 text-sm">
                        <Star className="w-4 h-4 inline fill-amber-400" />
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500">
                      {data.csatMine30d.count} avaliações · {data.csatMine30d.satisfactionRate ?? 0}% satisfeitos
                    </p>
                  </div>
                )}
              </TiFluxCard>

              <TiFluxCard title="Últimas notificações">
                {!data.recentNotifications || data.recentNotifications.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {data.recentNotifications.map((notif) => (
                      <div key={notif.id} className="flex items-start gap-2.5 text-xs py-1.5">
                        <Bell className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-mono text-brand-700 font-bold mr-1.5 text-[11px]">{notif.protocol}</span>
                          <span className="text-gray-700">{notif.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TiFluxCard>

              <TiFluxCard title="Chamados abertos por status" className="lg:col-span-2">
                {Object.keys(data.byStatus).length === 0 ? (
                  <EmptyState label="Nenhum chamado aberto no momento." />
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(data.byStatus).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-gray-700 font-medium">{STATUS_LABELS[status] ?? status}</span>
                        <span className="font-bold text-gray-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TiFluxCard>
            </div>
          )}

          {/* TAB: CHATS */}
          {activeTab === 'chats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TiFluxCard title="Meus chats">
                  <KpiRow
                    items={[
                      {
                        label: 'Em atendimento',
                        value: data.myChats?.inProgress ?? 0,
                        icon: <MessageSquare className="w-[18px] h-[18px]" />,
                        colorClass: 'text-teal-600',
                      },
                      {
                        label: 'Aguardando resposta',
                        value: data.myChats?.waitingResponse ?? 0,
                        icon: <MessageSquareDot className="w-[18px] h-[18px]" />,
                        colorClass: 'text-amber-500',
                      },
                      {
                        label: 'Média de espera',
                        value: `${data.myChats?.avgWaitMinutes ?? 0}m`,
                        icon: <Hourglass className="w-[18px] h-[18px]" />,
                        colorClass: 'text-indigo-500',
                      },
                      {
                        label: 'Média de atendimento',
                        value: `${data.myChats?.avgServiceMinutes ?? 0}m`,
                        icon: <Clock className="w-[18px] h-[18px]" />,
                        colorClass: 'text-green-600',
                      },
                    ]}
                  />
                </TiFluxCard>

                <TiFluxCard title="Todos os chats">
                  <KpiRow
                    items={[
                      {
                        label: 'Todos',
                        value: data.allChats?.inProgress !== undefined ? (data.allChats.inProgress + (data.allChats.waitingResponse ?? 0)) : data.openCount,
                        icon: <Users className="w-[18px] h-[18px]" />,
                        colorClass: 'text-teal-700',
                      },
                      {
                        label: 'Em atendimento',
                        value: data.allChats?.inProgress ?? data.openCount,
                        icon: <MessageSquare className="w-[18px] h-[18px]" />,
                        colorClass: 'text-teal-600',
                      },
                      {
                        label: 'Aguardando resposta',
                        value: data.allChats?.waitingResponse ?? 0,
                        icon: <MessageSquareDot className="w-[18px] h-[18px]" />,
                        colorClass: 'text-amber-500',
                      },
                      {
                        label: 'Média de espera',
                        value: `${data.allChats?.avgWaitMinutes ?? 0}m`,
                        icon: <Hourglass className="w-[18px] h-[18px]" />,
                        colorClass: 'text-indigo-500',
                      },
                      {
                        label: 'Média de atendimento',
                        value: `${data.allChats?.avgServiceMinutes ?? 0}m`,
                        icon: <Clock className="w-[18px] h-[18px]" />,
                        colorClass: 'text-green-600',
                      },
                    ]}
                  />
                </TiFluxCard>
              </div>

              <TiFluxCard title="Chats por departamentos" bodyClassName="p-0">
                {!data.chatsByDepartment || data.chatsByDepartment.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-100 text-gray-600">
                          <Th>Departamento</Th>
                          <Th>Todos</Th>
                          <Th>Em atendimento</Th>
                          <Th>Fila de espera</Th>
                          <Th>Aguardando resposta</Th>
                          <Th>Média de espera</Th>
                          <Th>Média de atendimento</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.chatsByDepartment.map((dept, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900">{dept.department}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.total}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.inProgress}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.waitingQueue}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.waitingResponse}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.avgWait}</td>
                            <td className="py-3 px-4 text-gray-700">{dept.avgService}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TiFluxCard>

              <TiFluxCard title="Chats por atendentes" bodyClassName="p-0">
                {!data.chatsByAgent || data.chatsByAgent.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-100 text-gray-600">
                          <Th>Atendente</Th>
                          <Th>Status</Th>
                          <Th>Em andamento</Th>
                          <Th>Grupo de atendente</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.chatsByAgent.map((ag, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900">{ag.name}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    ag.status === 'online' && 'bg-green-500',
                                    ag.status === 'busy' && 'bg-amber-500',
                                    ag.status === 'away' && 'bg-gray-400',
                                    ag.status === 'offline' && 'bg-red-500',
                                  )}
                                />
                                <span className="text-gray-700 capitalize">{ag.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{ag.inProgress}</td>
                            <td className="py-3 px-4 text-gray-700">{ag.group}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TiFluxCard>
            </div>
          )}

          {/* TAB: RECURSO */}
          {activeTab === 'recurso' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TiFluxCard title="Meus compromissos">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.myAppointments?.total ?? 0,
                      icon: <Calendar className="w-[18px] h-[18px]" />,
                      colorClass: 'text-gray-600',
                    },
                    {
                      label: 'Hoje',
                      value: data.myAppointments?.today ?? 0,
                      icon: <Calendar className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                    {
                      label: 'Semana',
                      value: data.myAppointments?.week ?? 0,
                      icon: <Calendar className="w-[18px] h-[18px]" />,
                      colorClass: 'text-indigo-500',
                    },
                    {
                      label: 'Mês',
                      value: data.myAppointments?.month ?? 0,
                      icon: <Calendar className="w-[18px] h-[18px]" />,
                      colorClass: 'text-teal-600',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard title="Todos os compromissos">
                <KpiRow
                  items={[
                    {
                      label: 'Todos',
                      value: data.allAppointments?.total ?? 0,
                      icon: <Briefcase className="w-[18px] h-[18px]" />,
                      colorClass: 'text-gray-600',
                    },
                    {
                      label: 'Hoje',
                      value: data.allAppointments?.today ?? 0,
                      icon: <Briefcase className="w-[18px] h-[18px]" />,
                      colorClass: 'text-amber-500',
                    },
                    {
                      label: 'Semana',
                      value: data.allAppointments?.week ?? 0,
                      icon: <Briefcase className="w-[18px] h-[18px]" />,
                      colorClass: 'text-indigo-500',
                    },
                    {
                      label: 'Mês',
                      value: data.allAppointments?.month ?? 0,
                      icon: <Briefcase className="w-[18px] h-[18px]" />,
                      colorClass: 'text-teal-600',
                    },
                  ]}
                />
              </TiFluxCard>

              <TiFluxCard title="Avaliação geral de tickets (30 dias)">
                {!data.csatGeneral30d || data.csatGeneral30d.count === 0 ? (
                  <EmptyState />
                ) : (
                  <p className="text-[13px] text-gray-600">
                    {data.csatGeneral30d.avg?.toFixed(1)} de média em {data.csatGeneral30d.count} avaliações.
                  </p>
                )}
              </TiFluxCard>

              <TiFluxCard title="Avaliação dos meus tickets (30 dias)">
                {!data.csatMine30d || data.csatMine30d.count === 0 ? (
                  <EmptyState />
                ) : (
                  <p className="text-[13px] text-gray-600">
                    {data.csatMine30d.avg?.toFixed(1)} de média em {data.csatMine30d.count} avaliações.
                  </p>
                )}
              </TiFluxCard>
            </div>
          )}

          {/* TAB: HORAS */}
          {activeTab === 'horas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TiFluxCard title="Minhas horas apontadas">
                <div className="flex items-center gap-10 mb-5">
                  <div>
                    <span className="text-[12px] text-gray-500 font-medium block mb-1">Ontem</span>
                    <span className="flex items-center gap-1.5 text-[19px] font-bold text-teal-600">
                      <UserCheck className="w-[18px] h-[18px]" />
                      {formatHoursAsClock(yesterdayHours)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-gray-500 font-medium block mb-1">Hoje</span>
                    <span className="flex items-center gap-1.5 text-[19px] font-bold text-amber-500">
                      <Clock className="w-[18px] h-[18px]" />
                      {formatHoursAsClock(todayHours)}
                    </span>
                  </div>
                </div>

                {weekDays.length === 0 ? (
                  <EmptyState />
                ) : (
                  <LineChart
                    series={[{ name: 'Horas apontadas', color: '#008561', values: weekDays.map((d) => d.loggedHours) }]}
                    xLabels={weekDays.map((d) => formatDateLabel(d.date))}
                  />
                )}

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-6 text-[12px] text-gray-500">
                  <span>
                    Horas apontadas <strong className="text-gray-800">{hoursLoggedTotal}H</strong>
                  </span>
                  <span>
                    Horas faltantes <strong className="text-gray-800">{hoursRemainingTotal}H</strong>
                  </span>
                  <span>
                    Meta mensal <strong className="text-gray-800">{hoursTargetTotal}H</strong>
                  </span>
                </div>
              </TiFluxCard>

              <TiFluxCard title="Tickets nos últimos 30 dias">
                {trend30d.length === 0 ? (
                  <EmptyState />
                ) : (
                  <LineChart
                    series={[
                      { name: 'Tickets criados', color: '#f59e0b', values: trend30d.map((d) => d.created) },
                      { name: 'Tickets fechados', color: '#14b8a6', values: trend30d.map((d) => d.closed) },
                      { name: 'Tickets cancelados', color: '#6366f1', values: trend30d.map((d) => d.cancelled) },
                    ]}
                    xLabels={trend30d.map((d) => formatDateLabel(d.date))}
                  />
                )}
              </TiFluxCard>

              <TiFluxCard title="Últimas notificações" className="lg:col-span-2">
                {!data.recentNotifications || data.recentNotifications.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {data.recentNotifications.map((notif) => (
                      <div key={notif.id} className="flex items-start gap-2.5 text-xs py-1.5">
                        <Bell className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-mono text-brand-700 font-bold mr-1.5 text-[11px]">{notif.protocol}</span>
                          <span className="text-gray-700">{notif.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TiFluxCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
