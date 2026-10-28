import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../../permissions/permissions.service';

/**
 * Granular authorization (DMTE-84, Tarefa 2), checked alongside RolesGuard
 * on every controller. ADMIN keeps a full bypass — equivalent to holding
 * every catalog permission — so a misconfigured PermissionGroup can never
 * lock an ADMIN out. TenantHelper/Role still decide tenant *visibility*;
 * this guard only decides *action* authorization.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    return this.permissionsService.hasPermission(user.id, ...requiredPermissions);
  }
}
