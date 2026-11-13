import { NotificationsController } from './notifications.controller';

describe('NotificationsController (DMTE-462 T6)', () => {
  const service = {
    list: jest.fn().mockResolvedValue({ unread: 0, items: [] }),
    markRead: jest.fn().mockResolvedValue(undefined),
    markAllRead: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const controller = new NotificationsController(service as any);
  const req = { user: { id: 'u-1', role: 'AGENT' } } as never;

  beforeEach(() => jest.clearAllMocks());

  it('AC-27: sempre age com o id do usuário autenticado, nunca com um id vindo da requisição', async () => {
    await controller.list(req);
    await controller.read('n-1', req);
    await controller.readAll(req);
    expect(service.list).toHaveBeenCalledWith('u-1');
    expect(service.markRead).toHaveBeenCalledWith('n-1', 'u-1');
    expect(service.markAllRead).toHaveBeenCalledWith('u-1');
  });
});
