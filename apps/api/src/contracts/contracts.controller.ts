import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtOrTokenAuthGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @RequirePermission('VIEW_CONTRACTS_ADMIN', 'VIEW_CONTRACTS_CLIENT')
  @ApiOperation({ summary: 'Lists contracts according to role mask' })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@CurrentUser() user: CurrentUserPayload, @Query('search') search?: string) {
    return this.contractsService.findAll(user, search);
  }

  @Get('preflight')
  @RequirePermission('MANAGE_CONTRACTS')
  preflight(@CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.preflight(user);
  }

  @Get(':id')
  @RequirePermission('VIEW_CONTRACTS_ADMIN', 'VIEW_CONTRACTS_CLIENT')
  @ApiOperation({ summary: 'Detalha contrato conforme organização e permissão financeira' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.findOne(id, user);
  }

  @Post(':id/update')
  @RequirePermission('MANAGE_CONTRACTS')
  @ApiOperation({ summary: 'Atualiza dados, vigência e ativação do contrato' })
  updateCommand(@Param('id') id: string, @Body() dto: UpdateContractDto, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.update(id, dto, user);
  }

  @Post()
  @RequirePermission('MANAGE_CONTRACTS')
  create(@Body() createContractDto: CreateContractDto, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.create(createContractDto, user);
  }

  @Patch(':id')
  @RequirePermission('MANAGE_CONTRACTS')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contractsService.update(id, updateContractDto, user);
  }

  @Delete(':id')
  @RequirePermission('MANAGE_CONTRACTS')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.remove(id, user);
  }
}
