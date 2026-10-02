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
import { Role } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ChangeServiceDeskDto } from "./dto/change-service-desk.dto";
import { UpdateParentDto } from "./dto/update-parent.dto";
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserPayload } from './decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.create(createTicketDto, req.user.id);
  }

  @Get()
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
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.update(id, updateTicketDto, req.user);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.assign(id, assignTicketDto.agentId, req.user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
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

  @Patch(':id/service-desk')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
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
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  async updateParent(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.updateParent(id, dto.parentProtocol, req.user);
  }
}
