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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly cnpjLookupService: CnpjLookupService,
  ) {}

  @Get('cnpj-lookup')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  lookupCnpj(@Query('cnpj') cnpj: string) {
    return this.cnpjLookupService.lookup(cnpj);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Post(':id/addresses')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  addAddress(@Param('id') id: string, @Body() dto: CreateOrganizationAddressDto) {
    return this.organizationsService.addAddress(id, dto);
  }

  @Delete(':id/addresses/:addressId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  removeAddress(@Param('id') id: string, @Param('addressId') addressId: string) {
    return this.organizationsService.removeAddress(id, addressId);
  }

  @Post(':id/contacts')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  addContact(@Param('id') id: string, @Body() dto: CreateOrganizationContactDto) {
    return this.organizationsService.addContact(id, dto);
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.organizationsService.removeContact(id, contactId);
  }

  @Post(':id/service-desks/:deskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  linkServiceDesk(@Param('id') id: string, @Param('deskId') deskId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.linkServiceDesk(id, deskId, user.id);
  }

  @Delete(':id/service-desks/:deskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  unlinkServiceDesk(@Param('id') id: string, @Param('deskId') deskId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.unlinkServiceDesk(id, deskId, user.id);
  }

  @Post(':id/agent-groups')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  createAgentGroup(@Param('id') id: string, @Body() dto: CreateAgentGroupDto) {
    return this.organizationsService.createAgentGroup(id, dto);
  }

  @Patch(':id/agent-groups/:agentGroupId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  updateAgentGroup(
    @Param('id') id: string,
    @Param('agentGroupId') agentGroupId: string,
    @Body() dto: UpdateAgentGroupDto,
  ) {
    return this.organizationsService.updateAgentGroup(id, agentGroupId, dto);
  }

  @Delete(':id/agent-groups/:agentGroupId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_CLIENTS_AND_RESOURCE_GROUPS')
  removeAgentGroup(@Param('id') id: string, @Param('agentGroupId') agentGroupId: string) {
    return this.organizationsService.removeAgentGroup(id, agentGroupId);
  }
}
