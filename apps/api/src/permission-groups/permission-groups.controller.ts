import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PermissionGroupsService } from './permission-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { UpdatePermissionGroupPermissionsDto } from './dto/update-permission-group-permissions.dto';
import { PERMISSION_CATALOG } from './permission-catalog';

/**
 * ADMIN-only for every handler, same as UsersController today. DMTE-84
 * Tarefa 2 will replace this with the granular MANAGE_PERMISSION_GROUPS
 * check once the permission-resolution layer exists — kept ADMIN-only here
 * so Tarefa 1 doesn't change who can do what, only adds the data model.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('permission-groups')
export class PermissionGroupsController {
  constructor(private readonly permissionGroupsService: PermissionGroupsService) {}

  @Get('catalog')
  @Roles(Role.ADMIN)
  getCatalog() {
    return PERMISSION_CATALOG;
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.permissionGroupsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.permissionGroupsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionGroupsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePermissionGroupDto) {
    return this.permissionGroupsService.update(id, dto);
  }

  @Patch(':id/permissions')
  @Roles(Role.ADMIN)
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupPermissionsDto,
  ) {
    return this.permissionGroupsService.updatePermissions(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.permissionGroupsService.remove(id);
  }

  @Post(':id/users/:userId')
  @Roles(Role.ADMIN)
  addUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.permissionGroupsService.addUser(id, userId);
  }

  @Delete(':id/users/:userId')
  @Roles(Role.ADMIN)
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.permissionGroupsService.removeUser(id, userId);
  }

  @Post(':id/technical-groups/:technicalGroupId')
  @Roles(Role.ADMIN)
  addTechnicalGroup(
    @Param('id') id: string,
    @Param('technicalGroupId') technicalGroupId: string,
  ) {
    return this.permissionGroupsService.addTechnicalGroup(id, technicalGroupId);
  }

  @Delete(':id/technical-groups/:technicalGroupId')
  @Roles(Role.ADMIN)
  removeTechnicalGroup(
    @Param('id') id: string,
    @Param('technicalGroupId') technicalGroupId: string,
  ) {
    return this.permissionGroupsService.removeTechnicalGroup(id, technicalGroupId);
  }
}
