import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface WorkloadItem {
  agentId: string;
  agentName: string;
  totalMinutes: number;
}

export interface BillingItem {
  organizationId: string;
  organizationName: string;
  billableMinutes: number;
  nonBillableMinutes: number;
  coveredMinutes: number;
  excessMinutes: number;
  totalValueCents: number;
  unknownValuationCount: number;
}

export interface TicketSummaryCounts {
  total: number;
  mine: number;
  unattended: number;
  inProgress: number;
  paused: number;
  overdue: number;
}

export interface DeadlineCounts {
  total: number;
  today: number;
  tomorrow: number;
  later: number;
}

export interface UnansweredCounts {
  total: number;
  mine: number;
}

export interface CsatSummary {
  avg: number | null;
  count: number;
  satisfactionRate: number | null;
}

export interface NotificationItem {
  id: string;
  protocol: string;
  title: string;
  message: string;
  createdAt: string;
  userName?: string;
}

export interface PieItem {
  name: string;
  count: number;
}

export interface InProgressBreakdown {
  byAssignee: PieItem[];
  byServiceDesk: PieItem[];
  byOrganization: PieItem[];
  byResource: PieItem[];
}

export interface DailyHours {
  day: number;
  date: string;
  targetHours: number;
  loggedHours: number;
  remainingHours: number;
}

export interface MonthlyHoursSummary {
  targetHoursTotal: number;
  loggedHoursTotal: number;
  remainingHoursTotal: number;
  days: DailyHours[];
}

export interface ChatQuadrant {
  inProgress: number;
  waitingResponse: number;
  avgWaitMinutes: number | null;
  avgServiceMinutes: number | null;
}

export interface ChatDepartmentItem {
  department: string;
  total: number;
  inProgress: number;
  waitingQueue: number;
  waitingResponse: number;
  avgWait: string | null;
  avgService: string | null;
}

export interface ChatAgentItem {
  name: string;
  status: 'online' | 'busy' | 'away' | 'offline' | null;
  inProgress: number;
  group: string;
}

export interface AppointmentSummary {
  total: number;
  today: number;
  week: number;
  month: number;
}

export interface TicketTrendDay {
  date: string;
  created: number;
  closed: number;
  cancelled: number;
}

export interface DashboardSummary {
  openCount: number;
  closedCount: number;
  slaBreachedCount: number;
  avgResolutionMinutes: number | null;
  byStatus: Record<string, number>;

  ticketSummary?: TicketSummaryCounts;
  responseDeadlines?: DeadlineCounts;
  solutionDeadlines?: DeadlineCounts;
  unansweredTickets?: UnansweredCounts;
  csatGeneral30d?: CsatSummary;
  csatMine30d?: CsatSummary;
  recentNotifications?: NotificationItem[];
  inProgressBreakdown?: InProgressBreakdown;
  monthlyHours?: MonthlyHoursSummary;
  myChats?: ChatQuadrant;
  allChats?: ChatQuadrant;
  chatsByDepartment?: ChatDepartmentItem[];
  chatsByAgent?: ChatAgentItem[];
  myAppointments?: AppointmentSummary;
  allAppointments?: AppointmentSummary;
  ticketsTrend30d?: TicketTrendDay[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>('/reports/summary');
      return data;
    },
  });
}

export function useReportWorkload(agentId?: string) {
  return useQuery({
    queryKey: ['reports', 'workload', agentId].filter(Boolean),
    queryFn: async () => {
      const { data } = await api.get<WorkloadItem[]>('/reports/workload', { params: { agentId } });
      return data;
    },
  });
}

export function useReportBilling(enabled: boolean, filters: { contractId?: string; startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: ['reports', 'billing', filters],
    queryFn: async () => {
      const { data } = await api.get<BillingItem[]>('/reports/billing', { params: filters });
      return data;
    },
    enabled,
  });
}
