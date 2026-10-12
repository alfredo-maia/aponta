import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorklogsService } from './worklogs.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
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
}
