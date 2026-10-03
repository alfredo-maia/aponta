import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER)
  @ApiOperation({ summary: 'Lists contracts according to role mask' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.contractsService.findAll(user);
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
