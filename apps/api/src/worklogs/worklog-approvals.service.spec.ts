import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorklogApprovalsService } from './worklog-approvals.service';

const user = { id: 'u-1', role: Role.AGENT };
const pending = (over: Record<string, unknown> = {}) => ({
  id: 'w-1', authorId: 'u-2', approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', approvalReason: 'O início 12/11 08:10 não cai na janela.',
  startTime: new Date('2026-11-12T11:10:00Z'), endTime: new Date('2026-11-12T12:10:00Z'), minutes: 60, voidedAt: null, ticketId: 't-1',
  ticket: { protocol: 'T-1001', title: 'Erro no ERP' }, author: { id: 'u-2', name: 'Ana Consultora', email: 'ana@aponta.test' }, ...over,
});

function setup(permitted: string[] = ['APPROVE_WORKLOG_ENTRY', 'APPROVE_WORKLOG_SYSTEM_CLOSED'], row: unknown = pending()) {
  const prisma: any = {
    worklog: {
      findMany: jest.fn().mockResolvedValue([pending()]),
      findUnique: jest.fn().mockResolvedValue(row),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ticket: { findUnique: jest.fn().mockResolvedValue({ protocol: 'T-1001', title: 'Erro no ERP' }) },
  };
  const permissions = {
    hasPermission: jest.fn((_id: string, key: string) => Promise.resolve(permitted.includes(key))),
    usersWithPermission: jest.fn().mockResolvedValue([{ id: 'g-1', name: 'Gerente', email: 'gerente@aponta.test' }, { id: 'u-2', name: 'Ana Consultora', email: 'ana@aponta.test' }]),
  };
  const mail = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
  return { prisma, permissions, mail, notifications, service: new WorklogApprovalsService(prisma, permissions as any, mail as any, notifications as any) };
}

describe('WorklogApprovalsService (DMTE-462 T5)', () => {
  it('AC-25: lista só os pendentes dos tipos que a pessoa libera', async () => {
    const { service, prisma } = setup(['APPROVE_WORKLOG_ENTRY']);
    await service.list(user);
    expect(prisma.worklog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { approvalStatus: 'PENDING', approvalType: { in: ['LANCAMENTO'] }, voidedAt: null },
    }));
  });

  it('AC-25: sem nenhuma permissão a lista vem vazia e nem consulta o banco; ADMIN também não tem desvio', async () => {
    const { service, prisma } = setup([]);
    await expect(service.list({ id: 'admin-1', role: Role.ADMIN })).resolves.toEqual([]);
    expect(prisma.worklog.findMany).not.toHaveBeenCalled();
  });

  it('AC-25: liberar torna o apontamento válido e grava quem decidiu e quando', async () => {
    const { service, prisma } = setup();
    await service.approve('w-1', user);
    expect(prisma.worklog.updateMany).toHaveBeenCalledWith({
      where: { id: 'w-1', approvalStatus: 'PENDING' },
      data: { approvalStatus: 'APPROVED', approvalDecidedBy: 'u-1', approvalDecidedAt: expect.any(Date) },
    });
  });

  it('AC-25: rejeitar exige motivo, estorna o apontamento e guarda o motivo', async () => {
    const { service, prisma } = setup();
    await expect(service.reject('w-1', '   ', user)).rejects.toThrow(BadRequestException);
    await expect(service.reject('w-1', undefined, user)).rejects.toThrow(BadRequestException);
    expect(prisma.worklog.updateMany).not.toHaveBeenCalled();
    await service.reject('w-1', 'Horário não confere com o atendimento', user);
    expect(prisma.worklog.updateMany).toHaveBeenCalledWith({
      where: { id: 'w-1', approvalStatus: 'PENDING' },
      data: expect.objectContaining({ approvalStatus: 'REJECTED', voidedAt: expect.any(Date), voidedBy: 'u-1', approvalDecidedBy: 'u-1', approvalDecisionNote: 'Horário não confere com o atendimento' }),
    });
  });

  it('AC-25: só decide quem tem a permissão do tipo daquele apontamento', async () => {
    const { service, prisma } = setup(['APPROVE_WORKLOG_SYSTEM_CLOSED']);
    await expect(service.approve('w-1', user)).rejects.toThrow(ForbiddenException);
    const closed = setup(['APPROVE_WORKLOG_SYSTEM_CLOSED'], pending({ approvalType: 'CRONOMETRO_ENCERRADO' }));
    await expect(closed.service.approve('w-1', user)).resolves.toBeDefined();
    expect(prisma.worklog.updateMany).not.toHaveBeenCalled();
    const admin = setup([]);
    await expect(admin.service.approve('w-1', { id: 'admin-1', role: Role.ADMIN })).rejects.toThrow(ForbiddenException);
  });

  it('AC-26: ninguém decide o próprio apontamento, mesmo com a permissão', async () => {
    const { service, prisma } = setup(undefined, pending({ authorId: 'u-1' }));
    await expect(service.approve('w-1', user)).rejects.toThrow(ForbiddenException);
    await expect(service.reject('w-1', 'motivo', user)).rejects.toThrow(ForbiddenException);
    expect(prisma.worklog.updateMany).not.toHaveBeenCalled();
  });

  it('AC-25: apontamento que não existe, já decidido ou que alguém decidiu no meio é recusado', async () => {
    await expect(setup(undefined, null).service.approve('w-1', user)).rejects.toThrow(NotFoundException);
    await expect(setup(undefined, pending({ approvalStatus: 'APPROVED' })).service.approve('w-1', user)).rejects.toThrow(BadRequestException);
    const race = setup();
    race.prisma.worklog.updateMany.mockResolvedValue({ count: 0 });
    await expect(race.service.approve('w-1', user)).rejects.toThrow(BadRequestException);
    expect(race.mail.sendEmail).not.toHaveBeenCalled();
  });

  it('AC-29: a decisão avisa o consultor por e-mail, com o motivo da rejeição', async () => {
    const { service, mail } = setup();
    await service.approve('w-1', user);
    expect(mail.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@aponta.test', subject: expect.stringMatching(/liberad/i) }));
    mail.sendEmail.mockClear();
    await service.reject('w-1', 'Horário não confere', user);
    const sent = mail.sendEmail.mock.calls[0][0];
    expect(sent.to).toBe('ana@aponta.test');
    expect(sent.subject).toMatch(/negad/i);
    expect(sent.text).toContain('Horário não confere');
    expect(sent.html).toContain('Horário não confere');
  });

  it('AC-29: a pendência avisa quem tem a permissão do tipo, menos o autor, com o motivo explicado', async () => {
    const { service, mail, permissions } = setup();
    await service.notifyPending(pending());
    expect(permissions.usersWithPermission).toHaveBeenCalledWith('APPROVE_WORKLOG_ENTRY');
    expect(mail.sendEmail).toHaveBeenCalledTimes(1);
    const sent = mail.sendEmail.mock.calls[0][0];
    expect(sent.to).toBe('gerente@aponta.test');
    expect(sent.subject).toMatch(/liberação pendente/i);
    expect(sent.text).toContain('O início 12/11 08:10 não cai na janela.');
  });

  it('AC-29: o e-mail escapa o que o usuário digitou e uma falha de envio não derruba o fluxo', async () => {
    const { service, mail, prisma } = setup();
    prisma.ticket.findUnique.mockResolvedValue({ protocol: 'T-1001', title: '<script>alert(1)</script>' });
    mail.sendEmail.mockRejectedValueOnce(new Error('SMTP fora'));
    await expect(service.notifyPending(pending())).resolves.toBeUndefined();
    expect(mail.sendEmail.mock.calls[0][0].html).not.toContain('<script>');
  });
});

describe('WorklogApprovalsService: sino (DMTE-462 T6)', () => {
  it('AC-28: a pendência notifica quem tem a permissão do tipo, menos o autor, com o motivo e o destino Liberações', async () => {
    const { service, notifications, permissions } = setup();
    await service.notifyPending(pending());
    expect(permissions.usersWithPermission).toHaveBeenCalledWith('APPROVE_WORKLOG_ENTRY');
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(['g-1'], expect.objectContaining({
      type: 'WORKLOG_APPROVAL_PENDING',
      link: '/releases',
      title: expect.stringMatching(/liberação pendente/i),
      body: expect.stringContaining('O início 12/11 08:10 não cai na janela.'),
    }));
  });

  it('AC-28: a falha do e-mail não impede a notificação', async () => {
    const { service, notifications, mail } = setup();
    mail.sendEmail.mockRejectedValue(new Error('SMTP fora'));
    await service.notifyPending(pending());
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('AC-28: liberar notifica o consultor autor, com o destino do ticket', async () => {
    const { service, notifications } = setup();
    await service.approve('w-1', user);
    expect(notifications.notify).toHaveBeenCalledWith(['u-2'], expect.objectContaining({
      type: 'WORKLOG_APPROVAL_DECIDED',
      link: '/tickets/t-1',
      title: expect.stringMatching(/liberad/i),
    }));
  });

  it('AC-28: negar notifica o consultor autor com o motivo da negação', async () => {
    const { service, notifications } = setup();
    await service.reject('w-1', 'Horário não confere', user);
    expect(notifications.notify).toHaveBeenCalledWith(['u-2'], expect.objectContaining({
      type: 'WORKLOG_APPROVAL_DECIDED',
      link: '/tickets/t-1',
      title: expect.stringMatching(/negad/i),
      body: expect.stringContaining('Horário não confere'),
    }));
  });

  it('AC-28: decisão recusada (corrida, sem permissão ou o próprio apontamento) não notifica', async () => {
    const corrida = setup();
    corrida.prisma.worklog.updateMany.mockResolvedValue({ count: 0 });
    await expect(corrida.service.approve('w-1', user)).rejects.toThrow();
    const proprio = setup(undefined, pending({ authorId: 'u-1' }));
    await expect(proprio.service.approve('w-1', user)).rejects.toThrow();
    expect(corrida.notifications.notify).not.toHaveBeenCalled();
    expect(proprio.notifications.notify).not.toHaveBeenCalled();
  });
});
