import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { JobsController } from './jobs.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('JobsController (DMTE-462 T3)', () => {
  const service = { list: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) };
  const controller = new JobsController(service as any);
  const permissions = { hasPermission: jest.fn() };
  const guard = new PermissionsGuard(new Reflector(), permissions as any);
  const contextFor = (handler: (...args: any[]) => unknown, user?: { id: string; role: Role }) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => JobsController,
  }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('AC-15: sem MANAGE_SCHEDULED_JOBS o AGENT não lista nem altera (403 pelo guard)', async () => {
    permissions.hasPermission.mockResolvedValue(false);
    const agent = { id: 'a-1', role: Role.AGENT };
    await expect(guard.canActivate(contextFor(controller.list, agent))).resolves.toBe(false);
    await expect(guard.canActivate(contextFor(controller.update, agent))).resolves.toBe(false);
    expect(permissions.hasPermission).toHaveBeenCalledWith('a-1', 'MANAGE_SCHEDULED_JOBS');
  });

  it('AC-15: com a permissão, o AGENT passa; o ADMIN passa como nas demais configurações', async () => {
    permissions.hasPermission.mockResolvedValue(true);
    await expect(guard.canActivate(contextFor(controller.list, { id: 'a-1', role: Role.AGENT }))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor(controller.update, { id: 'admin-1', role: Role.ADMIN }))).resolves.toBe(true);
  });

  it('AC-16: GET lista e PATCH repassa o tipo e o corpo ao serviço', async () => {
    await controller.list();
    await controller.update('HEARTBEAT', { cron: '*/10 * * * *', enabled: true });
    expect(service.list).toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('HEARTBEAT', { cron: '*/10 * * * *', enabled: true });
  });
});
