import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PermissionGroupsService } from './permission-groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { UpdatePermissionGroupPermissionsDto } from './dto/update-permission-group-permissions.dto';
import { PERMISSION_CATALOG } from './permission-catalog';

/**
 * MANAGE_PERMISSION_GROUPS on every handler (DMTE-84, Tarefa 2) — this is
 * the exact module the SPEC names as the replacement for the Tarefa 1
 * ADMIN-only placeholder. ADMIN keeps full access via PermissionsGuard's
 * bypass, no PermissionGroup link required.
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permission-groups')
export class PermissionGroupsController {
  constructor(private readonly permissionGroupsService: PermissionGroupsService) {}

  @Get('catalog')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  getCatalog() {
    return PERMISSION_CATALOG;
  }

  @Get()
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  findAll() {
    return this.permissionGroupsService.findAll();
  }

  @Get(':id')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  findOne(@Param('id') id: string) {
    return this.permissionGroupsService.findOne(id);
  }

  @Post()
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  create(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionGroupsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  update(@Param('id') id: string, @Body() dto: UpdatePermissionGroupDto) {
    return this.permissionGroupsService.update(id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupPermissionsDto,
  ) {
    return this.permissionGroupsService.updatePermissions(id, dto);
  }

  @Delete(':id')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  remove(@Param('id') id: string) {
    return this.permissionGroupsService.remove(id);
  }

  @Post(':id/users/:userId')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  addUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.permissionGroupsService.addUser(id, userId);
  }

  @Delete(':id/users/:userId')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.permissionGroupsService.removeUser(id, userId);
  }

  @Post(':id/technical-groups/:technicalGroupId')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  addTechnicalGroup(
    @Param('id') id: string,
    @Param('technicalGroupId') technicalGroupId: string,
  ) {
    return this.permissionGroupsService.addTechnicalGroup(id, technicalGroupId);
  }

  @Delete(':id/technical-groups/:technicalGroupId')
  @RequirePermission('MANAGE_PERMISSION_GROUPS')
  removeTechnicalGroup(
    @Param('id') id: string,
    @Param('technicalGroupId') technicalGroupId: string,
  ) {
    return this.permissionGroupsService.removeTechnicalGroup(id, technicalGroupId);
  }
}
