import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Role } from '@prisma/client';
import { WorkloadReportItemDto, BillingReportItemDto } from './dto/report.dto';

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
}
