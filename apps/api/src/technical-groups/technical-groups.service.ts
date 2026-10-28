import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalGroupDto } from './dto/create-technical-group.dto';
import { UpdateTechnicalGroupDto } from './dto/update-technical-group.dto';

const INCLUDE_DETAIL = {
  members: true,
  organizationLinks: { include: { organization: true } },
  serviceDeskLinks: { include: { serviceDesk: true } },
  permissionGroupLinks: { include: { permissionGroup: true } },
} as const;

@Injectable()
export class TechnicalGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.technicalGroup.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const group = await this.prisma.technicalGroup.findUnique({
      where: { id },
      include: INCLUDE_DETAIL,
    });

    if (!group) {
      throw new NotFoundException(`Technical group with ID ${id} not found`);
    }

    return group;
  }

  create(dto: CreateTechnicalGroupDto) {
    return this.prisma.technicalGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        dailyWorklogEmailEnabled: dto.dailyWorklogEmailEnabled ?? false,
        scheduleEnabled: dto.scheduleEnabled ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTechnicalGroupDto) {
    await this.findOne(id);
    return this.prisma.technicalGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.technicalGroup.delete({ where: { id } });
  }

  async addMember(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id: userId },
      data: { technicalGroupId: id },
    });
  }

  async removeMember(id: string, userId: string) {
    await this.findOne(id);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.technicalGroupId !== id) {
      throw new BadRequestException(
        `User ${userId} is not a member of technical group ${id}`,
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { technicalGroupId: null },
    });
  }

  async addOrganization(id: string, organizationId: string) {
    await this.findOne(id);
    return this.prisma.technicalGroupOrganization.upsert({
      where: { technicalGroupId_organizationId: { technicalGroupId: id, organizationId } },
      update: {},
      create: { technicalGroupId: id, organizationId },
    });
  }

  async removeOrganization(id: string, organizationId: string) {
    await this.findOne(id);
    return this.prisma.technicalGroupOrganization.delete({
      where: { technicalGroupId_organizationId: { technicalGroupId: id, organizationId } },
    });
  }

  async addServiceDesk(id: string, serviceDeskId: string) {
    await this.findOne(id);
    return this.prisma.technicalGroupServiceDesk.upsert({
      where: { technicalGroupId_serviceDeskId: { technicalGroupId: id, serviceDeskId } },
      update: {},
      create: { technicalGroupId: id, serviceDeskId },
    });
  }

  async removeServiceDesk(id: string, serviceDeskId: string) {
    await this.findOne(id);
    return this.prisma.technicalGroupServiceDesk.delete({
      where: { technicalGroupId_serviceDeskId: { technicalGroupId: id, serviceDeskId } },
    });
  }
}
