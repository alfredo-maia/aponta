import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('MANAGE_USERS')
  async findAll() {
    return this.usersService.findAll();
  }

  // Agent-assignment dropdown: any user who can work tickets needs to see
  // who tickets can be assigned to, so this rides VIEW_AND_OPEN_TICKETS
  // rather than MANAGE_USERS (which would wrongly require admin-grade
  // access just to populate an assignee picker).
  @Get('agents')
  @RequirePermission('VIEW_AND_OPEN_TICKETS')
  async getAgents() {
    return this.usersService.findAgents();
  }

  @Patch(':id')
  @RequirePermission('MANAGE_USERS')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateAdminFields(id, updateUserDto);
  }
}
