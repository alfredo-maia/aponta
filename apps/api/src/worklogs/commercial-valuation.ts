import { BadRequestException } from '@nestjs/common';
import { splitBillingCycles, valueContractMinutes } from './contract-valuation';

export interface CommercialTerm {
  id: string;
  effectiveFrom: Date;
  type: string;
  includedMinutes: number | null;
  hourlyRateCents: number | null;
  excessHourlyRateCents: number | null;
  monthlyFeeCents: number | null;
  fixedPriceCents: number | null;
  estimatedMinutes: number | null;
  scope?: string | null;
}

export function isCompleteCommercialTerm(term: CommercialTerm) {
  const cents = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
  if (term.type === 'HOURLY') return cents(term.hourlyRateCents);
  if (term.type === 'MONTHLY_HOURS') return cents(term.includedMinutes) && cents(term.monthlyFeeCents) && cents(term.excessHourlyRateCents);
  if (term.type === 'FIXED_PROJECT') return cents(term.fixedPriceCents) && cents(term.estimatedMinutes) && !!term.scope?.trim();
  return false;
}
export interface CommercialCost {
  id: string;
  effectiveFrom: Date;
  hourlyCostCents: number;
}
export interface CommercialSegment {
  cycleStart: string;
  cycleEnd: string;
  startTime: string;
  endTime: string;
  minutes: number;
  coveredMinutes: number;
  excessMinutes: number;
  amountCents: number;
  costCents: number | null;
  rateCents: number | null;
  costRateId: string | null;
  termId: string;
}

/** Immutable valuation, segmented at BOTH sale/cost changes and calendar months. */
export function allocateCommercialSegments(input: {
  start: Date; end: Date; terms: CommercialTerm[]; costRates: CommercialCost[];
  previous: Array<{ cycleStart: string; minutes: number }>;
  billable: boolean; valuationType: string; manualCents?: number;
}): CommercialSegment[] {
  const { start, end, terms, costRates, previous, billable, valuationType } = input;
  const total = Math.round((end.getTime() - start.getTime()) / 60000);
  if (total < 1 || end <= start) throw new BadRequestException('Intervalo comercial inválido');
  const cycles = splitBillingCycles(start, end);
  const boundaries = [...new Set([start.getTime(), end.getTime(),
    ...cycles.map(x => new Date(x.cycleEnd).getTime()),
    ...terms.map(x => x.effectiveFrom.getTime()), ...costRates.map(x => x.effectiveFrom.getTime()),
  ].filter(x => x >= start.getTime() && x <= end.getTime()))].sort((a, b) => a - b);
  const termOrder = [...terms].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  const costOrder = [...costRates].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  const consumed = new Map<string, number>();
  for (const prior of previous) consumed.set(prior.cycleStart, (consumed.get(prior.cycleStart) ?? 0) + prior.minutes);
  const segments: CommercialSegment[] = [];
  let assignedMinutes = 0;
  let assignedManual = 0;
  let saleUnits = 0;
  let costUnits = 0;
  for (let i = 0; i < boundaries.length - 1; i++) {
    const from = boundaries[i];
    const to = boundaries[i + 1];
    const term = termOrder.find(x => x.effectiveFrom.getTime() <= from);
    if (!term || !isCompleteCommercialTerm(term)) throw new BadRequestException('Contrato sem condições comerciais completas para todo o período');
    const cycle = cycles.find(x => new Date(x.cycleStart).getTime() <= from && new Date(x.cycleEnd).getTime() > from);
    if (!cycle) throw new BadRequestException('Ciclo comercial inválido');
    const cumulative = Math.round((to - start.getTime()) / 60000);
    const minutes = cumulative - assignedMinutes;
    assignedMinutes = cumulative;
    if (!minutes) continue;
    const cost = costOrder.find(x => x.effectiveFrom.getTime() <= from);
    const previousCost = Math.round(costUnits / 60);
    if (cost) costUnits += minutes * cost.hourlyCostCents;
    const costCents = cost ? Math.round(costUnits / 60) - previousCost : null;
    let coveredMinutes = 0;
    let excessMinutes = 0;
    let amountCents = 0;
    let rateCents: number | null = null;
    let pricedUnits = 0;
    if (valuationType === 'MANUAL') {
      const cumulativeValue = Math.round((input.manualCents ?? 0) * cumulative / total);
      amountCents = cumulativeValue - assignedManual;
      assignedManual = cumulativeValue;
    } else if (valuationType === 'CONTRACT' && billable) {
      if (term.type === 'HOURLY') {
        if (term.hourlyRateCents === null) throw new BadRequestException('Contrato avulso sem tarifa aprovada');
        rateCents = term.hourlyRateCents;
        pricedUnits = minutes * rateCents;
      } else if (term.type === 'MONTHLY_HOURS') {
        if (term.includedMinutes === null || term.excessHourlyRateCents === null) {
          throw new BadRequestException('Contrato mensal sem franquia ou tarifa aprovada');
        }
        rateCents = term.excessHourlyRateCents;
        const valued = valueContractMinutes({ ...term, type: 'HOURS_LIMIT', hoursLimit: null }, minutes, consumed.get(cycle.cycleStart) ?? 0);
        coveredMinutes = valued.coveredMinutes;
        excessMinutes = valued.excessMinutes;
        pricedUnits = excessMinutes * rateCents;
        consumed.set(cycle.cycleStart, (consumed.get(cycle.cycleStart) ?? 0) + minutes);
      } else if (term.type === 'FIXED_PROJECT') {
        coveredMinutes = minutes;
      } else {
        throw new BadRequestException('Regularize a modalidade comercial do contrato');
      }
      const previousSale = Math.round(saleUnits / 60);
      saleUnits += pricedUnits;
      amountCents = Math.round(saleUnits / 60) - previousSale;
    }
    for (const value of [amountCents, costCents]) {
      if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) {
        throw new BadRequestException('Valor comercial excede o limite permitido');
      }
    }
    segments.push({ cycleStart: cycle.cycleStart, cycleEnd: cycle.cycleEnd, startTime: new Date(from).toISOString(),
      endTime: new Date(to).toISOString(), minutes, coveredMinutes, excessMinutes, amountCents, costCents,
      rateCents, termId: term.id, costRateId: cost?.id ?? null });
  }
  return segments;
}
