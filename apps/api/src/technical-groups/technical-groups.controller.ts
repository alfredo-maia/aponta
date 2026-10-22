import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TechnicalGroupsService } from './technical-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTechnicalGroupDto } from './dto/create-technical-group.dto';
import { UpdateTechnicalGroupDto } from './dto/update-technical-group.dto';

/**
 * ADMIN-only for every handler, same reasoning as PermissionGroupsController:
 * Tarefa 1 only adds the data model, it does not change who can manage it.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('technical-groups')
export class TechnicalGroupsController {
  constructor(private readonly technicalGroupsService: TechnicalGroupsService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.technicalGroupsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.technicalGroupsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTechnicalGroupDto) {
    return this.technicalGroupsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTechnicalGroupDto) {
    return this.technicalGroupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.technicalGroupsService.remove(id);
  }

  @Post(':id/members/:userId')
  @Roles(Role.ADMIN)
  addMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.technicalGroupsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.technicalGroupsService.removeMember(id, userId);
  }

  @Post(':id/organizations/:organizationId')
  @Roles(Role.ADMIN)
  addOrganization(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.technicalGroupsService.addOrganization(id, organizationId);
  }

  @Delete(':id/organizations/:organizationId')
  @Roles(Role.ADMIN)
  removeOrganization(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.technicalGroupsService.removeOrganization(id, organizationId);
  }

  @Post(':id/service-desks/:serviceDeskId')
  @Roles(Role.ADMIN)
  addServiceDesk(
    @Param('id') id: string,
    @Param('serviceDeskId') serviceDeskId: string,
  ) {
    return this.technicalGroupsService.addServiceDesk(id, serviceDeskId);
  }

  @Delete(':id/service-desks/:serviceDeskId')
  @Roles(Role.ADMIN)
  removeServiceDesk(
    @Param('id') id: string,
    @Param('serviceDeskId') serviceDeskId: string,
  ) {
    return this.technicalGroupsService.removeServiceDesk(id, serviceDeskId);
  }
}
