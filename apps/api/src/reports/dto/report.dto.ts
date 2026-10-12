import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class TicketSummaryCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() mine!: number;
  @ApiProperty() unattended!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() paused!: number;
  @ApiProperty() overdue!: number;
}

export class DeadlineCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() today!: number;
  @ApiProperty() tomorrow!: number;
  @ApiProperty() later!: number;
}

export class UnansweredCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() mine!: number;
}

export class CsatSummaryDto {
  @ApiPropertyOptional() avg!: number | null;
  @ApiProperty() count!: number;
  @ApiPropertyOptional() satisfactionRate!: number | null;
}

export class NotificationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() protocol!: string;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() userName?: string;
}

export class PieItemDto {
  @ApiProperty() name!: string;
  @ApiProperty() count!: number;
}

export class InProgressBreakdownDto {
  @ApiProperty({ type: [PieItemDto] }) byAssignee!: PieItemDto[];
  @ApiProperty({ type: [PieItemDto] }) byServiceDesk!: PieItemDto[];
  @ApiProperty({ type: [PieItemDto] }) byOrganization!: PieItemDto[];
  @ApiProperty({ type: [PieItemDto] }) byResource!: PieItemDto[];
}

export class DailyHoursDto {
  @ApiProperty() day!: number;
  @ApiProperty() date!: string;
  @ApiProperty() targetHours!: number;
  @ApiProperty() loggedHours!: number;
  @ApiProperty() remainingHours!: number;
}

export class MonthlyHoursSummaryDto {
  @ApiProperty() targetHoursTotal!: number;
  @ApiProperty() loggedHoursTotal!: number;
  @ApiProperty() remainingHoursTotal!: number;
  @ApiProperty({ type: [DailyHoursDto] }) days!: DailyHoursDto[];
}

export class ChatQuadrantDto {
  @ApiProperty() inProgress!: number;
  @ApiProperty() waitingResponse!: number;
  @ApiPropertyOptional({ description: 'null: no real chat backend to source this from yet' })
  avgWaitMinutes!: number | null;
  @ApiPropertyOptional({ description: 'null: no real chat backend to source this from yet' })
  avgServiceMinutes!: number | null;
}

export class ChatDepartmentItemDto {
  @ApiProperty() department!: string;
  @ApiProperty() total!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() waitingQueue!: number;
  @ApiProperty() waitingResponse!: number;
  @ApiPropertyOptional({ description: 'null: no real chat backend to source this from yet' })
  avgWait!: string | null;
  @ApiPropertyOptional({ description: 'null: no real chat backend to source this from yet' })
  avgService!: string | null;
}

export class ChatAgentItemDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ description: 'null: no real presence source yet' })
  status!: 'online' | 'busy' | 'away' | 'offline' | null;
  @ApiProperty() inProgress!: number;
  @ApiProperty() group!: string;
}

export class AppointmentSummaryDto {
  @ApiProperty({ description: 'Contagem real, derivada da tabela Appointment' }) total!: number;
  @ApiProperty() today!: number;
  @ApiProperty() week!: number;
  @ApiProperty() month!: number;
}

export class TicketTrendDayDto {
  @ApiProperty() date!: string;
  @ApiProperty() created!: number;
  @ApiProperty() closed!: number;
  @ApiProperty() cancelled!: number;
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

  // Métricas do Dashboard TiFlux
  @ApiPropertyOptional() ticketSummary?: TicketSummaryCountsDto;
  @ApiPropertyOptional() responseDeadlines?: DeadlineCountsDto;
  @ApiPropertyOptional() solutionDeadlines?: DeadlineCountsDto;
  @ApiPropertyOptional() unansweredTickets?: UnansweredCountsDto;
  @ApiPropertyOptional() csatGeneral30d?: CsatSummaryDto;
  @ApiPropertyOptional() csatMine30d?: CsatSummaryDto;
  @ApiPropertyOptional({ type: [NotificationItemDto] }) recentNotifications?: NotificationItemDto[];
  @ApiPropertyOptional() inProgressBreakdown?: InProgressBreakdownDto;
  @ApiPropertyOptional() monthlyHours?: MonthlyHoursSummaryDto;
  @ApiPropertyOptional() myChats?: ChatQuadrantDto;
  @ApiPropertyOptional() allChats?: ChatQuadrantDto;
  @ApiPropertyOptional({ type: [ChatDepartmentItemDto] }) chatsByDepartment?: ChatDepartmentItemDto[];
  @ApiPropertyOptional({ type: [ChatAgentItemDto] }) chatsByAgent?: ChatAgentItemDto[];
  @ApiPropertyOptional() myAppointments?: AppointmentSummaryDto;
  @ApiPropertyOptional() allAppointments?: AppointmentSummaryDto;
  @ApiPropertyOptional({ type: [TicketTrendDayDto], description: 'Chamados criados/fechados/cancelados por dia, últimos 30 dias' })
  ticketsTrend30d?: TicketTrendDayDto[];
}
