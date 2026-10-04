import { ApiProperty } from '@nestjs/swagger';

export class WorkloadReportItemDto {
  @ApiProperty()
  agentId!: string;
  @ApiProperty()
  agentName!: string;
  @ApiProperty()
  totalMinutes!: number;
}

export class BillingReportItemDto {
  @ApiProperty()
  organizationId!: string;
  @ApiProperty()
  organizationName!: string;
  @ApiProperty()
  billableMinutes!: number;
  @ApiProperty()
  nonBillableMinutes!: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Chamados com status diferente de RESOLVED/CLOSED' })
  openCount!: number;
  @ApiProperty({ description: 'Chamados resolvidos ou fechados no período (todos, sem filtro de data)' })
  closedCount!: number;
  @ApiProperty({ description: 'Chamados abertos com SLA de resposta ou resolução estourado (BREACHED)' })
  slaBreachedCount!: number;
  @ApiProperty({ description: 'Tempo médio de resolução em minutos, entre chamados RESOLVED/CLOSED' })
  avgResolutionMinutes!: number | null;
  @ApiProperty({ description: 'Contagem de chamados abertos agrupados por status' })
  byStatus!: Record<string, number>;
}
