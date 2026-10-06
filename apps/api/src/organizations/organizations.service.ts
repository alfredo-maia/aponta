import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationAddressDto } from './dto/create-organization-address.dto';
import { CreateOrganizationContactDto } from './dto/create-organization-contact.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: createOrganizationDto,
    });
  }

  async findAll(active?: boolean) {
    return this.prisma.organization.findMany({
      where: active === undefined ? undefined : { active },
      include: {
        _count: { select: { users: true } },
      }
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        addresses: true,
        contacts: true,
        serviceDesks: { select: { id: true, name: true } },
        agentGroups: {
          include: { members: { select: { id: true, name: true, email: true } } },
        },
      }
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return org;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    await this.findOne(id); // Check exists
    return this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check exists
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  async addAddress(organizationId: string, dto: CreateOrganizationAddressDto) {
    await this.findOne(organizationId);
    return this.prisma.organizationAddress.create({
      data: { ...dto, organizationId },
    });
  }

  async removeAddress(organizationId: string, addressId: string) {
    await this.findOne(organizationId);
    const address = await this.prisma.organizationAddress.findUnique({ where: { id: addressId } });
    if (!address || address.organizationId !== organizationId) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }
    return this.prisma.organizationAddress.delete({ where: { id: addressId } });
  }

  async addContact(organizationId: string, dto: CreateOrganizationContactDto) {
    await this.findOne(organizationId);
    return this.prisma.organizationContact.create({
      data: { ...dto, organizationId },
    });
  }

  async removeContact(organizationId: string, contactId: string) {
    await this.findOne(organizationId);
    const contact = await this.prisma.organizationContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.organizationId !== organizationId) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
    return this.prisma.organizationContact.delete({ where: { id: contactId } });
  }

  /** Tiflux-parity (#57): aba "Relacionamentos" — vincular/desvincular uma Mesa a este cliente (N:N). */
  async linkServiceDesk(organizationId: string, serviceDeskId: string) {
    await this.findOne(organizationId);
    const desk = await this.prisma.serviceDesk.findUnique({ where: { id: serviceDeskId } });
    if (!desk) {
      throw new NotFoundException(`ServiceDesk with ID ${serviceDeskId} not found`);
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { serviceDesks: { connect: { id: serviceDeskId } } },
    });
    return this.findOne(organizationId);
  }

  async unlinkServiceDesk(organizationId: string, serviceDeskId: string) {
    await this.findOne(organizationId);
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { serviceDesks: { disconnect: { id: serviceDeskId } } },
    });
    return this.findOne(organizationId);
  }

  /** Tiflux-parity (#57): CRUD de Grupos de Atendentes — entidade por cliente. */
  async createAgentGroup(organizationId: string, dto: { name: string; memberIds?: string[] }) {
    await this.findOne(organizationId);
    return this.prisma.agentGroup.create({
      data: {
        name: dto.name,
        organizationId,
        ...(dto.memberIds && { members: { connect: dto.memberIds.map((id) => ({ id })) } }),
      },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateAgentGroup(
    organizationId: string,
    agentGroupId: string,
    dto: { name?: string; memberIds?: string[]; active?: boolean },
  ) {
    const group = await this.prisma.agentGroup.findUnique({ where: { id: agentGroupId } });
    if (!group || group.organizationId !== organizationId) {
      throw new NotFoundException(`AgentGroup with ID ${agentGroupId} not found`);
    }
    const { memberIds, ...data } = dto;
    return this.prisma.agentGroup.update({
      where: { id: agentGroupId },
      data: {
        ...data,
        ...(memberIds !== undefined && { members: { set: memberIds.map((id) => ({ id })) } }),
      },
      include: { members: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeAgentGroup(organizationId: string, agentGroupId: string) {
    const group = await this.prisma.agentGroup.findUnique({ where: { id: agentGroupId } });
    if (!group || group.organizationId !== organizationId) {
      throw new NotFoundException(`AgentGroup with ID ${agentGroupId} not found`);
    }
    return this.prisma.agentGroup.delete({ where: { id: agentGroupId } });
  }
}
