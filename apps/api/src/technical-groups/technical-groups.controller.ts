import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TechnicalGroupsService } from './technical-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateTechnicalGroupDto } from './dto/create-technical-group.dto';
import { UpdateTechnicalGroupDto } from './dto/update-technical-group.dto';

/**
 * MANAGE_USERS on every handler (DMTE-84, Tarefa 2) — "Grupos de atendentes"
 * is one of the 4 items under the "Usuários" settings submenu (SPEC Tarefa
 * 4), and the catalog has no dedicated "manage teams" key, so it shares
 * MANAGE_USERS with the Usuários screen itself.
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('technical-groups')
export class TechnicalGroupsController {
  constructor(private readonly technicalGroupsService: TechnicalGroupsService) {}

  @Get()
  @RequirePermission('MANAGE_USERS')
  findAll() {
    return this.technicalGroupsService.findAll();
  }

  @Get(':id')
  @RequirePermission('MANAGE_USERS')
  findOne(@Param('id') id: string) {
    return this.technicalGroupsService.findOne(id);
  }

  @Post()
  @RequirePermission('MANAGE_USERS')
  create(@Body() dto: CreateTechnicalGroupDto) {
    return this.technicalGroupsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MANAGE_USERS')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicalGroupDto) {
    return this.technicalGroupsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('MANAGE_USERS')
  remove(@Param('id') id: string) {
    return this.technicalGroupsService.remove(id);
  }

  @Post(':id/members/:userId')
  @RequirePermission('MANAGE_USERS')
  addMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.technicalGroupsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @RequirePermission('MANAGE_USERS')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.technicalGroupsService.removeMember(id, userId);
  }

  @Post(':id/organizations/:organizationId')
  @RequirePermission('MANAGE_USERS')
  addOrganization(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.technicalGroupsService.addOrganization(id, organizationId);
  }

  @Delete(':id/organizations/:organizationId')
  @RequirePermission('MANAGE_USERS')
  removeOrganization(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.technicalGroupsService.removeOrganization(id, organizationId);
  }

  @Post(':id/service-desks/:serviceDeskId')
  @RequirePermission('MANAGE_USERS')
  addServiceDesk(
    @Param('id') id: string,
    @Param('serviceDeskId') serviceDeskId: string,
  ) {
    return this.technicalGroupsService.addServiceDesk(id, serviceDeskId);
  }

  @Delete(':id/service-desks/:serviceDeskId')
  @RequirePermission('MANAGE_USERS')
  removeServiceDesk(
    @Param('id') id: string,
    @Param('serviceDeskId') serviceDeskId: string,
  ) {
    return this.technicalGroupsService.removeServiceDesk(id, serviceDeskId);
  }
}
