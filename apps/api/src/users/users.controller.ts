import { Controller, Get, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('agents')
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  async getAgents(@Req() req: AuthenticatedRequest) {
    return this.usersService.findAgents(req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateAdminFields(id, updateUserDto);
  }
}
