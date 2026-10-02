import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VaultService } from './vault.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Vault')
@ApiBearerAuth()
@Controller('vault')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT)
  @ApiOperation({ summary: 'List all credentials scoped by User Tenant' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.findAll(user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new credential' })
  create(@Body() dto: CreateCredentialDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.create(dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a credential' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.remove(id, user);
  }
}
