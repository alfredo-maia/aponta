import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { AgendaService } from './agenda.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';

@ApiTags('Agenda')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtOrTokenAuthGuard, PermissionsGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @RequirePermission('VIEW_ALL_SCHEDULES')
  @ApiOperation({ summary: 'Listar compromissos com escopo de permissão e filtros' })
  findAll(@Query() query: QueryAppointmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.agendaService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('VIEW_ALL_SCHEDULES')
  @ApiOperation({ summary: 'Obter detalhes de um compromisso' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.agendaService.findOne(id, user);
  }

  @Post()
  @RequirePermission('CREATE_TICKET_SCHEDULING')
  @ApiOperation({ summary: 'Criar um novo compromisso ou alocação temporal' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.agendaService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermission('CREATE_TICKET_SCHEDULING')
  @ApiOperation({ summary: 'Atualizar um compromisso existente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.agendaService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('CREATE_TICKET_SCHEDULING')
  @ApiOperation({ summary: 'Remover um compromisso' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.agendaService.remove(id, user);
  }
}
