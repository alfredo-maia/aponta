import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resolves a user's effective permission keys (DMTE-84, Tarefa 2):
 * union of every PermissionGroup linked directly to the user
 * (PermissionGroupUser) plus every PermissionGroup linked via the user's
 * TechnicalGroup (PermissionGroupTechnicalGroup), deduplicated. ADMIN
 * bypass lives in PermissionsGuard, not here, so this service stays a
 * pure "what is this user linked to" lookup.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(userId: string): Promise<Set<string>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        permissionGroupLinks: {
          select: { permissionGroup: { select: { permissions: true } } },
        },
        technicalGroup: {
          select: {
            permissionGroupLinks: {
              select: { permissionGroup: { select: { permissions: true } } },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    if (!user) {
      return permissions;
    }

    for (const link of user.permissionGroupLinks) {
      for (const key of link.permissionGroup.permissions) {
        permissions.add(key);
      }
    }

    if (user.technicalGroup) {
      for (const link of user.technicalGroup.permissionGroupLinks) {
        for (const key of link.permissionGroup.permissions) {
          permissions.add(key);
        }
      }
    }

    return permissions;
  }

  async hasPermission(userId: string, ...requiredKeys: string[]): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId);
    return requiredKeys.some((key) => effective.has(key));
  }

  /** DMTE-464: sem bypass de ADMIN, só o grupo de permissões decide quem vê valores. */
  async canViewTicketValues(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'VIEW_TICKET_VALUES');
  }

  /** DMTE-462 T5: sem desvio por role; quem tem a permissão de qualquer tipo de liberação vê o item "Liberações". */
  async canReleaseWorklogs(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'APPROVE_WORKLOG_ENTRY', 'APPROVE_WORKLOG_SYSTEM_CLOSED');
  }

  /** DMTE-462 T4: quem tem a chave num grupo direto ou pelo grupo técnico; sem desvio por role. */
  async usersWithPermission(key: string): Promise<{ id: string; name: string; email: string }[]> {
    const group = { permissionGroup: { permissions: { has: key } } };
    return this.prisma.user.findMany({
      where: { active: true, OR: [{ permissionGroupLinks: { some: group } }, { technicalGroup: { permissionGroupLinks: { some: group } } }] },
      select: { id: true, name: true, email: true },
    });
  }

  /** DMTE-462 T2: só quem tem a chave marca compromisso que ignora a regra de apontamento. */
  async canReleaseWorklogWithoutSchedule(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'RELEASE_WORKLOG_WITHOUT_SCHEDULE');
  }

  /** DMTE-462 T1: sem desvio por role; só o grupo de permissões libera digitar hora inicial e final. */
  async canEditWorklogStartTime(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'EDIT_WORKLOG_START_TIME');
  }
}
