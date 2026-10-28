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
}
