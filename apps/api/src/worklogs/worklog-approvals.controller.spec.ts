import { WorklogApprovalsController } from './worklog-approvals.controller';

describe('WorklogApprovalsController (DMTE-462 T5)', () => {
  const service = { list: jest.fn().mockResolvedValue([]), approve: jest.fn().mockResolvedValue({}), reject: jest.fn().mockResolvedValue({}) };
  const controller = new WorklogApprovalsController(service as any);
  const req = { user: { id: 'u-1', role: 'AGENT' } } as never;

  beforeEach(() => jest.clearAllMocks());

  it('AC-25: listar, liberar e negar delegam ao serviço com o usuário (a permissão do tipo é conferida lá)', async () => {
    await controller.list(req);
    await controller.approve('w-1', req);
    await controller.reject('w-1', { note: 'Horário não confere' }, req);
    expect(service.list).toHaveBeenCalledWith({ id: 'u-1', role: 'AGENT' });
    expect(service.approve).toHaveBeenCalledWith('w-1', { id: 'u-1', role: 'AGENT' });
    expect(service.reject).toHaveBeenCalledWith('w-1', 'Horário não confere', { id: 'u-1', role: 'AGENT' });
  });

  it('AC-25: negar sem corpo repassa o motivo vazio e deixa o serviço recusar', async () => {
    await controller.reject('w-1', undefined as never, req);
    expect(service.reject).toHaveBeenCalledWith('w-1', undefined, { id: 'u-1', role: 'AGENT' });
  });
});
