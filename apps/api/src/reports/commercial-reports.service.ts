import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { splitBillingCycles } from '../worklogs/contract-valuation';

interface RecordedSegment {
  cycleStart: string;
  minutes: number;
  amountCents?: number | null;
  costCents?: number | null;
}
interface Snapshot {
  organizationId?: string | null;
  segments?: RecordedSegment[];
}

/** Management estimate only: no cash receipts, taxes or net-profit claim. */
@Injectable()
export class CommercialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCommercial(user: CurrentUserPayload, filters: { contractId?: string; month?: string } = {}) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Resultado e custos são restritos ao administrador');
    if (filters.month && !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(filters.month)) throw new BadRequestException('Competência inválida; use YYYY-MM');
    const now = new Date();
    const currentParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
    const defaultMonth = `${currentParts.year}-${currentParts.month}`;
    const bounds = (month: string) => {
      // Mid-month probe avoids midnight/DST ambiguity; the common billing
      // engine supplies the actual São Paulo boundaries, including old DST.
      const cycle = splitBillingCycles(new Date(`${month}-15T12:00:00Z`), new Date(`${month}-15T12:01:00Z`))[0];
      return { from: new Date(cycle.cycleStart), to: new Date(cycle.cycleEnd) };
    };
    const selectedBounds = filters.month ? bounds(filters.month) : null;
    const contracts = await this.prisma.contract.findMany({
      where: filters.contractId ? { id: filters.contractId } : {},
      include: { organization: { select: { name: true } }, terms: { orderBy: { effectiveFrom: 'asc' } }, lifecycleEvents: { orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { id: 'asc' }, take: 501,
    });
    if (contracts.length > 500) throw new BadRequestException('Selecione um contrato para limitar o relatório');
    if (!contracts.length) return [];
    const worklogs = await this.prisma.worklog.findMany({
      where: {
        contractId: { in: contracts.map(contract => contract.id) }, voidedAt: null, ticket: TenantHelper.getTicketWhere(user),
        ...(selectedBounds ? { startTime: { lt: selectedBounds.to }, endTime: { gt: selectedBounds.from } } : {}),
      },
      select: { contractId: true, minutes: true, startTime: true, billable: true, valuationType: true, valueCents: true, value: true, costCents: true, valuationSnapshot: true },
      take: 50001,
    });
    if (worklogs.length > 50000) throw new BadRequestException('Limite de registros excedido; selecione contrato e competência');
    return contracts.map(contract => {
      const project = contract.type === 'FIXED_PROJECT';
      const month = filters.month ?? (project ? null : defaultMonth);
      const { from, to } = month ? bounds(month) : { from: new Date(0), to: new Date(8640000000000000) };
      const terms = contract.terms ?? [];
      const events = contract.lifecycleEvents ?? [];
      const at = month ? from : now;
      const state = [...events].reverse().find(event => event.effectiveFrom <= at);
      const projectTermWasApproved = (effectiveFrom: Date, nextTermAt: Date) => events.some((event, index) => {
        if (!event.approved || !event.active || !event.startsAt) return false;
        const start = Math.max(effectiveFrom.getTime(), event.effectiveFrom.getTime(), event.startsAt.getTime());
        const end = Math.min(nextTermAt.getTime(), events[index + 1]?.effectiveFrom.getTime() ?? Infinity, event.endsAt?.getTime() ?? Infinity, now.getTime());
        return start < end;
      });
      const term = [...terms].reverse().find(item => item.effectiveFrom <= at &&
        // Price is retained only if its economic version actually overlapped
        // an approved lifecycle interval; suspension cannot erase old price.
        (!project || projectTermWasApproved(item.effectiveFrom, terms[terms.indexOf(item) + 1]?.effectiveFrom ?? new Date(8640000000000000))));
      const commercial = term ?? (terms.length ? null : contract);
      const row = {
        contractId: contract.id, contractName: contract.name ?? 'Contrato',
        organizationId: contract.organizationId, organizationName: contract.organization.name,
        type: commercial?.type ?? contract.type, period: month ?? 'all',
        effortMinutes: 0, bonusMinutes: 0, knownCostCents: 0, unknownCostMinutes: 0,
        incrementalRevenueCents: 0, unknownRevenueMinutes: 0,
        fixedRevenueCents: 0 as number | null, totalRevenueCents: null as number | null,
        resultCents: null as number | null, status: 'ESTIMATED',
        estimatedMinutes: commercial?.estimatedMinutes ?? null,
        remainingEstimateMinutes: null as number | null,
        projectPriceCents: project ? commercial?.fixedPriceCents ?? null : null,
        hasIncompleteCosts: false,
      };
      for (const log of worklogs) {
        if (log.contractId !== contract.id) continue;
        const snapshot = log.valuationSnapshot as Snapshot | null;
        if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, 'organizationId') && snapshot.organizationId !== contract.organizationId) continue;
        const all = Array.isArray(snapshot?.segments) ? snapshot.segments : [];
        const selected = all.filter(segment => {
          const date = Date.parse(segment.cycleStart);
          return !month || (date >= from.getTime() && date < to.getTime());
        });
        if (!all.length && month && !(log.startTime >= from && log.startTime < to)) continue;
        const segments: Array<{ minutes: number; amountCents?: number | null; costCents?: number | null }> = all.length ? selected : [{ minutes: log.minutes, amountCents: log.valueCents ?? (log.value == null ? null : Math.round(log.value * 100)), costCents: log.costCents }];
        for (const segment of segments) {
          row.effortMinutes += segment.minutes;
          if (log.valuationType === 'GUARANTEE' || log.billable === false) row.bonusMinutes += segment.minutes;
          if (segment.costCents == null) row.unknownCostMinutes += segment.minutes;
          else row.knownCostCents += segment.costCents;
          if (segment.amountCents == null) row.unknownRevenueMinutes += segment.minutes;
          else row.incrementalRevenueCents += segment.amountCents;
        }
      }
      const authorized = project
        ? Boolean(commercial && (term || (!terms.length && projectTermWasApproved(contract.startsAt ?? new Date(0), now))))
        : Boolean(commercial && state?.approved && state.active);
      if (project) {
        row.fixedRevenueCents = authorized && !month ? commercial?.fixedPriceCents ?? null : null;
        row.status = month ? 'PROJECT_MONTH_REVENUE_UNALLOCATED' : 'PROJECT_PARTIAL';
        row.remainingEstimateMinutes = row.estimatedMinutes == null ? null : Math.max(0, row.estimatedMinutes - row.effortMinutes);
      } else if (row.type === 'MONTHLY_HOURS') {
        const partial = !state?.startsAt || state.startsAt > from || (state.endsAt != null && state.endsAt < to)
          || terms.some(item => item.effectiveFrom > from && item.effectiveFrom < to)
          || events.some(event => event.effectiveFrom > from && event.effectiveFrom < to);
        row.fixedRevenueCents = authorized && !partial ? commercial?.monthlyFeeCents ?? null : null;
        if (partial) row.status = 'PARTIAL_MONTH_REVENUE_PENDING';
      } else if (row.type !== 'HOURLY') row.fixedRevenueCents = null;
      if (!authorized) row.fixedRevenueCents = null;
      row.hasIncompleteCosts = row.unknownCostMinutes > 0;
      if (row.fixedRevenueCents != null && !row.unknownRevenueMinutes) {
        row.totalRevenueCents = row.fixedRevenueCents + row.incrementalRevenueCents;
        if (!row.hasIncompleteCosts) row.resultCents = row.totalRevenueCents - row.knownCostCents;
      } else if (row.status === 'ESTIMATED') row.status = 'REVENUE_INCOMPLETE';
      return row;
    });
  }
}
