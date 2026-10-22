import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { UpdatePermissionGroupPermissionsDto } from './dto/update-permission-group-permissions.dto';

const INCLUDE_MEMBERS = {
  userMembers: { include: { user: true } },
  technicalGroupLinks: { include: { technicalGroup: true } },
} as const;

@Injectable()
export class PermissionGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permissionGroup.findMany({
      orderBy: { name: 'asc' },
      include: INCLUDE_MEMBERS,
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: INCLUDE_MEMBERS,
    });

    if (!group) {
      throw new NotFoundException(`Permission group with ID ${id} not found`);
    }

    return group;
  }

  create(dto: CreatePermissionGroupDto) {
    return this.prisma.permissionGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions ?? [],
      },
    });
  }

  async update(id: string, dto: UpdatePermissionGroupDto) {
    await this.findOne(id);
    return this.prisma.permissionGroup.update({ where: { id }, data: dto });
  }

  async updatePermissions(id: string, dto: UpdatePermissionGroupPermissionsDto) {
    await this.findOne(id);
    return this.prisma.permissionGroup.update({
      where: { id },
      data: { permissions: dto.permissions },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.permissionGroup.delete({ where: { id } });
  }

  async addUser(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.permissionGroupUser.upsert({
      where: { permissionGroupId_userId: { permissionGroupId: id, userId } },
      update: {},
      create: { permissionGroupId: id, userId },
    });
  }

  async removeUser(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.permissionGroupUser.delete({
      where: { permissionGroupId_userId: { permissionGroupId: id, userId } },
    });
  }

  async addTechnicalGroup(id: string, technicalGroupId: string) {
    await this.findOne(id);
    return this.prisma.permissionGroupTechnicalGroup.upsert({
      where: {
        permissionGroupId_technicalGroupId: { permissionGroupId: id, technicalGroupId },
      },
      update: {},
      create: { permissionGroupId: id, technicalGroupId },
    });
  }

  async removeTechnicalGroup(id: string, technicalGroupId: string) {
    await this.findOne(id);
    return this.prisma.permissionGroupTechnicalGroup.delete({
      where: {
        permissionGroupId_technicalGroupId: { permissionGroupId: id, technicalGroupId },
      },
    });
  }
}
