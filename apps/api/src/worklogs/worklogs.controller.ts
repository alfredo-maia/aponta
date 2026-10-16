import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorklogsService } from './worklogs.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
import { CreatePreAppointmentDto } from './dto/create-pre-appointment.dto';
import { StopPreAppointmentDto } from './dto/stop-pre-appointment.dto';
import { WorklogContractQueryDto } from './dto/worklog-contract-query.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

@ApiTags('Worklogs')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
export class WorklogsController {
  constructor(private readonly worklogsService: WorklogsService) {}

  @Get(':ticketId/worklog-contracts')
  @ApiOperation({ summary: 'Contratos elegíveis para um apontamento, com valores protegidos por papel' })
  eligibleContracts(@Param('ticketId') ticketId: string, @Query() query: WorklogContractQueryDto, @Req() req: AuthenticatedRequest) {
    return this.worklogsService.eligibleContracts(ticketId, query.startTime, query.endTime, req.user);
  }

  @Post(':ticketId/worklogs')
  @ApiOperation({ summary: 'Registrar apontamento de horas no chamado' })
  @ApiResponse({ status: 201, description: 'Apontamento registrado com sucesso.' })
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateWorklogDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.create(ticketId, dto, req.user);
  }

  @Get(':ticketId/worklogs')
  @ApiOperation({ summary: 'Listar apontamentos de horas do chamado' })
  findByTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.findByTicket(ticketId, req.user);
  }

  @Delete(':ticketId/worklogs/:worklogId')
  @ApiOperation({ summary: 'Excluir apontamento de horas' })
  delete(
    @Param('ticketId') ticketId: string,
    @Param('worklogId') worklogId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.delete(ticketId, worklogId, req.user);
  }

  @Post(':ticketId/pre-appointments')
  @ApiOperation({ summary: 'Criar pré-apontamento (não substitui os anteriores)' })
  @ApiResponse({ status: 201, description: 'Pré-apontamento criado.' })
  createPreAppointment(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreatePreAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.createPreAppointment(ticketId, dto, req.user);
  }

  @Get(':ticketId/pre-appointments')
  @ApiOperation({ summary: 'Listar pré-apontamentos persistidos do chamado' })
  findPreAppointments(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.findPreAppointments(ticketId, req.user);
  }

  @Patch(':ticketId/pre-appointments/:preAppointmentId')
  @ApiOperation({ summary: 'Encerrar (parar) um pré-apontamento em aberto' })
  stopPreAppointment(
    @Param('ticketId') ticketId: string,
    @Param('preAppointmentId') preAppointmentId: string,
    @Body() dto: StopPreAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.stopPreAppointment(ticketId, preAppointmentId, dto, req.user);
  }

  @Delete(':ticketId/pre-appointments/:preAppointmentId')
  @ApiOperation({ summary: 'Remover pré-apontamento' })
  deletePreAppointment(
    @Param('ticketId') ticketId: string,
    @Param('preAppointmentId') preAppointmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.worklogsService.deletePreAppointment(ticketId, preAppointmentId, req.user);
  }
}
