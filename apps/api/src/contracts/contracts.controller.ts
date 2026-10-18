import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER)
  @ApiOperation({ summary: 'Lists contracts according to role mask' })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@CurrentUser() user: CurrentUserPayload, @Query('search') search?: string) {
    return this.contractsService.findAll(user, search);
  }

  @Get('preflight')
  @Roles(Role.ADMIN)
  preflight(@CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.preflight(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER)
  @ApiOperation({ summary: 'Detalha contrato conforme organização e permissão financeira' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.findOne(id, user);
  }

  @Post(':id/update')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza dados, vigência e ativação do contrato' })
  updateCommand(@Param('id') id: string, @Body() dto: UpdateContractDto, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.update(id, dto, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createContractDto: CreateContractDto, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.create(createContractDto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contractsService.update(id, updateContractDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.remove(id, user);
  }
}
