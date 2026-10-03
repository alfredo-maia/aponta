import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkloadReportItemDto, BillingReportItemDto } from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('workload')
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER)
  @ApiOperation({ summary: 'Extrato de apontamentos/carga de trabalho' })
  @ApiResponse({ status: 200, type: [WorkloadReportItemDto] })
  @ApiQuery({ name: 'agentId', required: false, description: 'Filtrar por agente (ignorado se solicitante for AGENT comum)' })
  getWorkload(@CurrentUser() user: CurrentUserPayload, @Query('agentId') agentId?: string) {
    return this.reportsService.getWorkload(user, agentId);
  }

  @Get('billing')
  @Roles(Role.ADMIN, Role.CLIENT_MASTER)
  @ApiOperation({ summary: 'Relatório de Faturamento por cliente' })
  @ApiResponse({ status: 200, type: [BillingReportItemDto] })
  getBilling(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getBilling(user);
  }
}
