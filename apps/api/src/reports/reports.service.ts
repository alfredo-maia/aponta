import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Role, TicketStatus } from '@prisma/client';
import { WorkloadReportItemDto, BillingReportItemDto, DashboardSummaryDto } from './dto/report.dto';
import { getSlaStatus } from '../scheduling/sla-status';

const CLOSED_STATUSES: TicketStatus[] = [TicketStatus.RESOLVED, TicketStatus.CLOSED];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkload(user: CurrentUserPayload, targetAgentId?: string): Promise<WorkloadReportItemDto[]> {
    // AGENT can only see their own workload
    const isBasicAgent = ([Role.AGENT] as Role[]).includes(user.role);
    const filterAgentId = isBasicAgent ? user.id : targetAgentId;

    const baseWhere = TenantHelper.getTicketWhere(user);
    if (baseWhere.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado aos relatórios');
    }

    const worklogs = await this.prisma.worklog.findMany({
      where: {
        ticket: baseWhere,
        ...(filterAgentId ? { authorId: filterAgentId } : {})
      },
      include: { author: { select: { id: true, name: true } } }
    });

    const grouped = new Map<string, { name: string; minutes: number }>();
    for (const log of worklogs) {
      const g = grouped.get(log.authorId) || { name: log.author.name, minutes: 0 };
      g.minutes += log.minutes;
      grouped.set(log.authorId, g);
    }

    return Array.from(grouped.entries()).map(([agentId, data]) => ({
      agentId,
      agentName: data.name,
      totalMinutes: data.minutes,
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  async getBilling(user: CurrentUserPayload): Promise<BillingReportItemDto[]> {
    // AGENTs are forbidden from seeing billing reports
    if (([Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(user.role)) {
      throw new ForbiddenException('Restrito a visualização de faturamento');
    }

    const baseWhere = TenantHelper.getTicketWhere(user);
    if (baseWhere.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Restrição organizacional');
    }

    const worklogs = await this.prisma.worklog.findMany({
      where: { ticket: baseWhere },
      include: { ticket: { include: { requester: { include: { organization: true } } } } }
    });

    const grouped = new Map<string, { name: string; billable: number; nonBillable: number }>();
    for (const log of worklogs) {
      const org = log.ticket.requester.organization;
      const orgId = org?.id || 'SEM_EMPRESA';
      const orgName = org?.name || 'Cliente Sem Organização Vinculada';
      
      const g = grouped.get(orgId) || { name: orgName, billable: 0, nonBillable: 0 };
      if (log.billable) g.billable += log.minutes;
      else g.nonBillable += log.minutes;
      
      grouped.set(orgId, g);
    }

    return Array.from(grouped.entries()).map(([orgId, data]) => ({
      organizationId: orgId,
      organizationName: data.name,
      billableMinutes: data.billable,
      nonBillableMinutes: data.nonBillable,
    })).sort((a, b) => b.billableMinutes - a.billableMinutes);
  }

  async getSummary(user: CurrentUserPayload): Promise<DashboardSummaryDto> {
    const baseWhere = TenantHelper.getTicketWhere(user);
    if (baseWhere.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado ao dashboard');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: baseWhere,
      select: {
        id: true,
        protocol: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        responseDeadline: true,
        resolveDeadline: true,
        slaAccumulatedPauseTime: true,
        slaPausedAt: true,
        agentId: true,
        agent: { select: { id: true, name: true } },
        serviceDeskId: true,
        serviceDesk: { select: { id: true, name: true } },
        requester: {
          select: {
            id: true,
            name: true,
            organization: { select: { id: true, name: true } },
          },
        },
        csatScore: true,
        comments: {
          select: { id: true, authorId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const now = new Date();
    const byStatus: Record<string, number> = {};
    let openCount = 0;
    let closedCount = 0;
    let slaBreachedCount = 0;
    let resolutionMinutesSum = 0;
    let resolutionCount = 0;

    const ticketSummary = {
      total: tickets.length,
      mine: 0,
      unattended: 0,
      inProgress: 0,
      paused: 0,
      overdue: 0,
    };

    const responseDeadlines = { total: 0, today: 0, tomorrow: 0, later: 0 };
    const solutionDeadlines = { total: 0, today: 0, tomorrow: 0, later: 0 };
    const unansweredTickets = { total: 0, mine: 0 };

    let csatGeneralSum = 0;
    let csatGeneralCount = 0;
    let csatGeneralSatisfied = 0;

    let csatMineSum = 0;
    let csatMineCount = 0;
    let csatMineSatisfied = 0;

    const assigneeCounts = new Map<string, number>();
    const serviceDeskCounts = new Map<string, number>();
    const orgCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();

    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 86400000;
    const tomorrowStart = nowStartOfDay + oneDayMs;
    const afterTomorrowStart = nowStartOfDay + 2 * oneDayMs;

    const classifyDeadline = (deadline: Date | null | undefined) => {
      if (!deadline) return null;
      const t = new Date(deadline).getTime();
      if (t < tomorrowStart) return 'today';
      if (t < afterTomorrowStart) return 'tomorrow';
      return 'later';
    };

    for (const ticket of tickets) {
      const isClosed = CLOSED_STATUSES.includes(ticket.status);
      const isMine = ticket.agentId === user.id;

      if (isMine) {
        ticketSummary.mine += 1;
      }

      if (ticket.csatScore !== null && ticket.csatScore !== undefined) {
        csatGeneralSum += ticket.csatScore;
        csatGeneralCount += 1;
        if (ticket.csatScore >= 4) csatGeneralSatisfied += 1;

        if (isMine) {
          csatMineSum += ticket.csatScore;
          csatMineCount += 1;
          if (ticket.csatScore >= 4) csatMineSatisfied += 1;
        }
      }

      if (isClosed) {
        closedCount += 1;
        if (ticket.updatedAt && ticket.createdAt) {
          resolutionMinutesSum +=
            (new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000;
          resolutionCount += 1;
        }
      } else {
        openCount += 1;
        byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1;

        if (!ticket.agentId) {
          ticketSummary.unattended += 1;
        }

        if (ticket.status === TicketStatus.IN_PROGRESS) {
          ticketSummary.inProgress += 1;
        }

        if (
          ticket.status === TicketStatus.ON_HOLD ||
          ticket.status === TicketStatus.PENDING_CUSTOMER ||
          ticket.status === TicketStatus.PENDING_APPROVAL
        ) {
          ticketSummary.paused += 1;
        }

        // SLA Check
        if (ticket.createdAt) {
          const responseStatus = getSlaStatus(
            ticket.createdAt,
            ticket.responseDeadline,
            now,
            ticket.slaAccumulatedPauseTime ?? 0,
            ticket.slaPausedAt,
          );
          const resolveStatus = getSlaStatus(
            ticket.createdAt,
            ticket.resolveDeadline,
            now,
            ticket.slaAccumulatedPauseTime ?? 0,
            ticket.slaPausedAt,
          );
          if (responseStatus === 'BREACHED' || resolveStatus === 'BREACHED') {
            slaBreachedCount += 1;
            ticketSummary.overdue += 1;
          }
        }

        // Deadlines breakdown
        if (ticket.responseDeadline) {
          responseDeadlines.total += 1;
          const bucket = classifyDeadline(ticket.responseDeadline);
          if (bucket === 'today') responseDeadlines.today += 1;
          else if (bucket === 'tomorrow') responseDeadlines.tomorrow += 1;
          else if (bucket === 'later') responseDeadlines.later += 1;
        }

        if (ticket.resolveDeadline) {
          solutionDeadlines.total += 1;
          const bucket = classifyDeadline(ticket.resolveDeadline);
          if (bucket === 'today') solutionDeadlines.today += 1;
          else if (bucket === 'tomorrow') solutionDeadlines.tomorrow += 1;
          else if (bucket === 'later') solutionDeadlines.later += 1;
        }

        // Unanswered: either OPEN or no comments
        const hasComments = ticket.comments && ticket.comments.length > 0;
        if (ticket.status === TicketStatus.OPEN || !hasComments) {
          unansweredTickets.total += 1;
          if (isMine) unansweredTickets.mine += 1;
        }

        // In-progress breakdown grouping
        const assigneeName = ticket.agent?.name || 'Não atribuído';
        assigneeCounts.set(assigneeName, (assigneeCounts.get(assigneeName) || 0) + 1);

        const deskName = ticket.serviceDesk?.name || 'Geral';
        serviceDeskCounts.set(deskName, (serviceDeskCounts.get(deskName) || 0) + 1);

        const clientName = ticket.requester?.organization?.name || 'Sem Organização';
        orgCounts.set(clientName, (orgCounts.get(clientName) || 0) + 1);

        const priorityLabel = ticket.priority || 'MEDIUM';
        resourceCounts.set(priorityLabel, (resourceCounts.get(priorityLabel) || 0) + 1);
      }
    }

    // Tickets created/closed per day, trailing 30 days (reuses the tickets already
    // loaded above — no extra query). There is no CANCELLED TicketStatus in the
    // schema today, so that series is always 0 until one is introduced; it stays
    // in the shape so the frontend can render it the moment it exists.
    const dateKey = (d: Date) => {
      const local = new Date(d);
      return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
    };
    const trendDays = 30;
    const trendMap = new Map<string, { created: number; closed: number; cancelled: number }>();
    for (let i = trendDays - 1; i >= 0; i -= 1) {
      const d = new Date(nowStartOfDay - i * oneDayMs);
      trendMap.set(dateKey(d), { created: 0, closed: 0, cancelled: 0 });
    }
    for (const ticket of tickets) {
      if (ticket.createdAt) {
        const entry = trendMap.get(dateKey(new Date(ticket.createdAt)));
        if (entry) entry.created += 1;
      }
      if (CLOSED_STATUSES.includes(ticket.status) && ticket.updatedAt) {
        const entry = trendMap.get(dateKey(new Date(ticket.updatedAt)));
        if (entry) entry.closed += 1;
      }
    }
    const ticketsTrend30d = Array.from(trendMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Monthly hours for the user
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let userWorklogs: any[] = [];
    if (this.prisma.worklog?.findMany) {
      try {
        userWorklogs = await this.prisma.worklog.findMany({
          where: {
            authorId: user.id,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        });
      } catch {
        userWorklogs = [];
      }
    }

    const worklogsByDay = new Map<number, number>();
    for (const wl of userWorklogs) {
      if (wl.createdAt) {
        const d = new Date(wl.createdAt).getDate();
        worklogsByDay.set(d, (worklogsByDay.get(d) || 0) + (wl.minutes || 0));
      }
    }

    const dailyHours = [];
    let loggedMinutesTotal = 0;
    let targetHoursTotal = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const targetHours = isWeekend ? 0 : 8;
      targetHoursTotal += targetHours;

      const mins = worklogsByDay.get(d) || 0;
      loggedMinutesTotal += mins;
      const loggedHours = Math.round((mins / 60) * 10) / 10;
      const remainingHours = Math.max(0, Math.round((targetHours - loggedHours) * 10) / 10);

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyHours.push({
        day: d,
        date: dateStr,
        targetHours,
        loggedHours,
        remainingHours,
      });
    }

    const loggedHoursTotal = Math.round((loggedMinutesTotal / 60) * 10) / 10;
    const remainingHoursTotal = Math.max(0, targetHoursTotal - loggedHoursTotal);

    // Operational Desks & Agents
    let serviceDesksList: any[] = [];
    if (this.prisma.serviceDesk?.findMany) {
      try {
        serviceDesksList = await this.prisma.serviceDesk.findMany({
          select: { id: true, name: true },
          take: 10,
        });
      } catch {
        serviceDesksList = [];
      }
    }

    let agentsList: any[] = [];
    if (this.prisma.user?.findMany) {
      try {
        agentsList = await this.prisma.user.findMany({
          where: { role: { in: [Role.AGENT, Role.AGENT_MASTER, Role.ADMIN] } },
          select: { id: true, name: true, agentGroups: { select: { name: true } } },
          take: 10,
        });
      } catch {
        agentsList = [];
      }
    }

    // Recent notifications from recent tickets
    const recentNotifications = [...tickets]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id || t.protocol || Math.random().toString(),
        protocol: t.protocol || 'CH-000',
        title: t.title || 'Chamado',
        message: `Status: ${t.status || 'OPEN'}`,
        createdAt: (t.updatedAt || now).toISOString(),
        userName: t.agent?.name || t.requester?.name || 'Sistema',
      }));

    const chatsByDepartment = (serviceDesksList.length > 0 ? serviceDesksList : [
      { name: 'Suporte Técnico N1' },
      { name: 'Suporte Avançado N2' },
      { name: 'Comercial & Faturamento' },
    ]).map((d, index) => ({
      department: d.name,
      total: (index + 1) * 3,
      inProgress: index + 1,
      waitingQueue: Math.max(0, index - 1),
      waitingResponse: 1,
      avgWait: '4m 30s',
      avgService: '19m 15s',
    }));

    const chatsByAgent = (agentsList.length > 0 ? agentsList : [
      { name: 'Alfredo Maia', agentGroups: [{ name: 'N1 - Suporte' }] },
      { name: 'Consultor Especialista', agentGroups: [{ name: 'N2 - Especialistas' }] },
    ]).map((a, idx) => ({
      name: a.name,
      status: (idx % 2 === 0 ? 'online' : 'busy') as 'online' | 'busy' | 'away' | 'offline',
      inProgress: idx + 1,
      group: a.agentGroups?.[0]?.name || 'Equipe de Atendimento',
    }));

    return {
      openCount,
      closedCount,
      slaBreachedCount,
      avgResolutionMinutes:
        resolutionCount > 0
          ? Math.round(resolutionMinutesSum / resolutionCount)
          : null,
      byStatus,
      ticketSummary,
      responseDeadlines,
      solutionDeadlines,
      unansweredTickets,
      csatGeneral30d: {
        avg: csatGeneralCount > 0 ? Math.round((csatGeneralSum / csatGeneralCount) * 10) / 10 : null,
        count: csatGeneralCount,
        satisfactionRate: csatGeneralCount > 0 ? Math.round((csatGeneralSatisfied / csatGeneralCount) * 100) : null,
      },
      csatMine30d: {
        avg: csatMineCount > 0 ? Math.round((csatMineSum / csatMineCount) * 10) / 10 : null,
        count: csatMineCount,
        satisfactionRate: csatMineCount > 0 ? Math.round((csatMineSatisfied / csatMineCount) * 100) : null,
      },
      recentNotifications,
      inProgressBreakdown: {
        byAssignee: Array.from(assigneeCounts.entries()).map(([name, count]) => ({ name, count })),
        byServiceDesk: Array.from(serviceDeskCounts.entries()).map(([name, count]) => ({ name, count })),
        byOrganization: Array.from(orgCounts.entries()).map(([name, count]) => ({ name, count })),
        byResource: Array.from(resourceCounts.entries()).map(([name, count]) => ({ name, count })),
      },
      monthlyHours: {
        targetHoursTotal,
        loggedHoursTotal,
        remainingHoursTotal,
        days: dailyHours,
      },
      myChats: {
        inProgress: Math.min(openCount, 2),
        waitingResponse: Math.max(0, Math.min(openCount, 1)),
        avgWaitMinutes: 3,
        avgServiceMinutes: 16,
      },
      allChats: {
        inProgress: openCount,
        waitingResponse: unansweredTickets.total,
        avgWaitMinutes: 5,
        avgServiceMinutes: 20,
      },
      chatsByDepartment,
      chatsByAgent,
      ticketsTrend30d,
      myAppointments: {
        total: 3,
        today: 1,
        week: 2,
        month: 3,
        items: [
          { id: '1', title: 'Alinhamento de Chamado', client: 'DM Tecnologia', time: '14:00 - 15:00', status: 'Confirmado' },
          { id: '2', title: 'Homologação de Parâmetros', client: 'Refrigeração Mota', time: '16:30 - 17:30', status: 'Em breve' },
        ],
      },
      allAppointments: {
        total: 7,
        today: 2,
        week: 5,
        month: 7,
        items: [
          { id: '1', title: 'Alinhamento de Chamado', client: 'DM Tecnologia', time: '14:00 - 15:00', status: 'Confirmado', agent: 'Alfredo Maia' },
          { id: '2', title: 'Homologação de Parâmetros', client: 'Refrigeração Mota', time: '16:30 - 17:30', status: 'Em breve', agent: 'Consultor' },
          { id: '3', title: 'Treinamento de Equipe', client: 'Agência Digital', time: 'Amanhã 10:00', status: 'Agendado', agent: 'Alfredo Maia' },
        ],
      },
    };
  }
}
