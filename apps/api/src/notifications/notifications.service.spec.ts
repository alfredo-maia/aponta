import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const row = (over: Record<string, unknown> = {}) => ({ id: 'n-1', userId: 'u-1', type: 'WORKLOG_AUTOCLOSE', title: 'T', body: 'B', link: '/tickets/t-1', readAt: null, createdAt: new Date('2026-11-13T10:00:00Z'), ...over });

function setup(flagOn = true) {
  const prisma: any = {
    notification: {
      findMany: jest.fn().mockResolvedValue([row()]),
      count: jest.fn().mockResolvedValue(3),
      findFirst: jest.fn().mockResolvedValue(row()),
      update: jest.fn().mockResolvedValue(row({ readAt: new Date() })),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const flags = { isEnabled: jest.fn().mockReturnValue(flagOn) };
  return { prisma, flags, service: new NotificationsService(prisma, flags as any) };
}

describe('NotificationsService (DMTE-462 T6)', () => {
  it('AC-27: lista só as 30 mais recentes do usuário e conta as não lidas dele', async () => {
    const { service, prisma } = setup();
    const result = await service.list('u-1');
    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userId: 'u-1' }, orderBy: { createdAt: 'desc' }, take: 30 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null } });
    expect(result).toEqual({ unread: 3, items: [row()] });
  });

  it('AC-27: marca como lida a do dono, gravando quando leu', async () => {
    const { service, prisma } = setup();
    await service.markRead('n-1', 'u-1');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'n-1', userId: 'u-1' } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n-1' }, data: { readAt: expect.any(Date) } });
  });

  it('AC-27: a notificação de outro usuário responde 404 e não é alterada', async () => {
    const { service, prisma } = setup();
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('n-9', 'u-1')).rejects.toThrow(NotFoundException);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('AC-27: marcar de novo uma já lida não regrava a data', async () => {
    const { service, prisma } = setup();
    prisma.notification.findFirst.mockResolvedValue(row({ readAt: new Date('2026-11-13T11:00:00Z') }));
    await service.markRead('n-1', 'u-1');
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('AC-27: marcar todas atinge só as não lidas do usuário', async () => {
    const { service, prisma } = setup();
    await expect(service.markAllRead('u-1')).resolves.toEqual({ count: 2 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null }, data: { readAt: expect.any(Date) } });
  });

  it('AC-28: grava uma notificação por destinatário, sem repetir usuário', async () => {
    const { service, prisma } = setup();
    await service.notify(['u-1', 'g-1', 'u-1'], { type: 'WORKLOG_AUTOCLOSE', title: 'Fechou', body: 'Texto', link: '/tickets/t-1' });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u-1', type: 'WORKLOG_AUTOCLOSE', title: 'Fechou', body: 'Texto', link: '/tickets/t-1' },
        { userId: 'g-1', type: 'WORKLOG_AUTOCLOSE', title: 'Fechou', body: 'Texto', link: '/tickets/t-1' },
      ],
    });
  });

  it('AC-28: sem destinatário não consulta o banco', async () => {
    const { service, prisma } = setup();
    await service.notify([], { type: 'WORKLOG_AUTOCLOSE', title: 'a', body: 'b', link: '/' });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('AC-35: com a flag sino-notificacoes desligada não grava nada', async () => {
    const { service, prisma, flags } = setup(false);
    await service.notify(['u-1'], { type: 'WORKLOG_AUTOCLOSE', title: 'a', body: 'b', link: '/' });
    expect(flags.isEnabled).toHaveBeenCalledWith('sino-notificacoes');
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('AC-28: falha ao gravar só é registrada e não derruba quem chamou', async () => {
    const { service, prisma } = setup();
    prisma.notification.createMany.mockRejectedValue(new Error('banco caiu'));
    await expect(service.notify(['u-1'], { type: 'WORKLOG_AUTOCLOSE', title: 'a', body: 'b', link: '/' })).resolves.toBeUndefined();
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });
});
