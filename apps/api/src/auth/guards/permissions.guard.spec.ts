import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

function buildContext(user: unknown, metadata: string[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(metadata),
  };
  const context: any = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
  return { context, reflector };
}

describe('PermissionsGuard', () => {
  let mockPermissionsService: { hasPermission: jest.Mock };

  beforeEach(() => {
    mockPermissionsService = { hasPermission: jest.fn() };
  });

  it('allows the request when no @RequirePermission metadata is set', async () => {
    const { context, reflector } = buildContext({ id: 'u-1', role: Role.AGENT }, undefined);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
  });

  it('always allows ADMIN, even with no PermissionGroup linked', async () => {
    const { context, reflector } = buildContext({ id: 'u-1', role: Role.ADMIN }, ['MANAGE_USERS']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
  });

  it('allows a non-ADMIN user who holds one of the required permissions', async () => {
    mockPermissionsService.hasPermission.mockResolvedValue(true);
    const { context, reflector } = buildContext({ id: 'u-1', role: Role.AGENT }, ['MANAGE_USERS']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith('u-1', 'MANAGE_USERS');
  });

  it('denies a non-ADMIN user who holds none of the required permissions', async () => {
    mockPermissionsService.hasPermission.mockResolvedValue(false);
    const { context, reflector } = buildContext({ id: 'u-1', role: Role.AGENT }, ['MANAGE_USERS']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('denies when there is no authenticated user', async () => {
    const { context, reflector } = buildContext(undefined, ['MANAGE_USERS']);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('reads metadata under PERMISSIONS_KEY from handler and class', async () => {
    const { context, reflector } = buildContext({ id: 'u-1', role: Role.AGENT }, []);
    const guard = new PermissionsGuard(reflector as unknown as Reflector, mockPermissionsService as any);

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
