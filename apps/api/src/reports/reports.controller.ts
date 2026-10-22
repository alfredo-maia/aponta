import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { BillingFilterDto } from './dto/billing-filter.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkloadReportItemDto, BillingReportItemDto, DashboardSummaryDto } from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtOrTokenAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @RequirePermission('VIEW_ADMIN_REPORTS', 'VIEW_AGENT_REPORTS', 'VIEW_LAST_30_DAYS_TICKETS_WIDGET')
  @ApiOperation({ summary: 'Resumo de métricas para o Dashboard (contagens, SLA, tempo médio)' })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getSummary(user);
  }

  @Get('workload')
  @RequirePermission('VIEW_AGENT_REPORTS', 'VIEW_WORKLOG_INFO')
  @ApiOperation({ summary: 'Extrato de apontamentos/carga de trabalho' })
  @ApiResponse({ status: 200, type: [WorkloadReportItemDto] })
  @ApiQuery({ name: 'agentId', required: false, description: 'Filtrar por agente (ignorado se solicitante for AGENT comum)' })
  getWorkload(@CurrentUser() user: CurrentUserPayload, @Query('agentId') agentId?: string) {
    return this.reportsService.getWorkload(user, agentId);
  }

  @Get('billing')
  @RequirePermission('VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT')
  @ApiOperation({ summary: 'Relatório de Faturamento por cliente' })
  @ApiResponse({ status: 200, type: [BillingReportItemDto] })
  getBilling(@CurrentUser() user: CurrentUserPayload, @Query() filters?: BillingFilterDto) {
    return filters ? this.reportsService.getBilling(user, filters) : this.reportsService.getBilling(user);
  }
}
