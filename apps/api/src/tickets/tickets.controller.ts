import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ChangeTicketStageDto } from '../service-desks/dto/ticket-stage.dto';
import { ChangeServiceDeskDto } from "./dto/change-service-desk.dto";
import { UpdateParentDto } from "./dto/update-parent.dto";
import { AddSlaHoursDto } from './dto/add-sla-hours.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUserPayload } from './decorators/current-user.decorator';

import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtOrTokenAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket', description: 'Creates a ticket acting on behalf of the user using strictly predefined DTO rules' })
  @ApiResponse({ status: 201, description: 'Ticket successfully created.' })
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.create(createTicketDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter tickets', description: 'Lists tickets respecting User/Tenant/Role visibility rules via the core generic helper' })
  findAll(
    @Query() query: TicketQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ticketsService.findOne(id, req.user);
  }

  @Get(':id/audits')
  findAudits(@Param('id') id: string) {
    return this.ticketsService.findAudits(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.update(id, updateTicketDto, req.user);
  }

  @Patch(':id/assign')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  assign(
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.assign(id, assignTicketDto.agentId, req.user);
  }

  @Patch(':id/stage')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeTicketStageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.changeStage(id, dto.stageId, req.user);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  @ApiOperation({ summary: 'Fast mutate ticket status', description: 'Dedicated Action intent to change a ticket status, triggering specific events on the state machine' })
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.changeStatus(
      id,
      changeStatusDto.status,
      req.user,
    );
  }

  @Post(':id/cancel')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  @ApiOperation({ summary: 'Cancel a ticket', description: 'Closes the ticket as cancelled when the mesa allows it' })
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ticketsService.cancel(id, req.user);
  }

  @Post(':id/sla/add-hours')
  @UseGuards(PermissionsGuard)
  @RequirePermission('ADD_SLA_TIME')
  @ApiOperation({ summary: 'Add SLA hours', description: 'Extends response and resolve deadlines when the mesa allows it' })
  addSlaHours(
    @Param('id') id: string,
    @Body() dto: AddSlaHoursDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.addSlaHours(id, dto.hours, req.user);
  }

  @Patch(':id/service-desk')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  changeServiceDesk(
    @Param('id') id: string,
    @Body() changeServiceDeskDto: ChangeServiceDeskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.changeServiceDesk(
      id,
      changeServiceDeskDto.serviceDeskId,
      req.user,
    );
  }
@Patch(':id/parent')
  @UseGuards(PermissionsGuard)
  @RequirePermission('EDIT_TICKETS')
  async updateParent(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.updateParent(id, dto.parentProtocol, req.user);
  }
}
