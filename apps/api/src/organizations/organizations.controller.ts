import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CnpjLookupService } from './cnpj-lookup.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationAddressDto } from './dto/create-organization-address.dto';
import { CreateOrganizationContactDto } from './dto/create-organization-contact.dto';
import { CreateAgentGroupDto } from './dto/create-agent-group.dto';
import { UpdateAgentGroupDto } from './dto/update-agent-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly cnpjLookupService: CnpjLookupService,
  ) {}

  @Get('cnpj-lookup')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  lookupCnpj(@Query('cnpj') cnpj: string) {
    return this.cnpjLookupService.lookup(cnpj);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    const activeFilter = active === undefined ? undefined : active === 'true';
    return this.organizationsService.findAll(activeFilter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Post(':id/addresses')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  addAddress(@Param('id') id: string, @Body() dto: CreateOrganizationAddressDto) {
    return this.organizationsService.addAddress(id, dto);
  }

  @Delete(':id/addresses/:addressId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeAddress(@Param('id') id: string, @Param('addressId') addressId: string) {
    return this.organizationsService.removeAddress(id, addressId);
  }

  @Post(':id/contacts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  addContact(@Param('id') id: string, @Body() dto: CreateOrganizationContactDto) {
    return this.organizationsService.addContact(id, dto);
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.organizationsService.removeContact(id, contactId);
  }

  @Post(':id/service-desks/:deskId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  linkServiceDesk(@Param('id') id: string, @Param('deskId') deskId: string) {
    return this.organizationsService.linkServiceDesk(id, deskId);
  }

  @Delete(':id/service-desks/:deskId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  unlinkServiceDesk(@Param('id') id: string, @Param('deskId') deskId: string) {
    return this.organizationsService.unlinkServiceDesk(id, deskId);
  }

  @Post(':id/agent-groups')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createAgentGroup(@Param('id') id: string, @Body() dto: CreateAgentGroupDto) {
    return this.organizationsService.createAgentGroup(id, dto);
  }

  @Patch(':id/agent-groups/:agentGroupId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateAgentGroup(
    @Param('id') id: string,
    @Param('agentGroupId') agentGroupId: string,
    @Body() dto: UpdateAgentGroupDto,
  ) {
    return this.organizationsService.updateAgentGroup(id, agentGroupId, dto);
  }

  @Delete(':id/agent-groups/:agentGroupId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeAgentGroup(@Param('id') id: string, @Param('agentGroupId') agentGroupId: string) {
    return this.organizationsService.removeAgentGroup(id, agentGroupId);
  }
}
