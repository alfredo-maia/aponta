import { WorklogAutoCloseService } from './worklog-autoclose.service';

const T = (hhmm: string, day = '2026-11-12') => new Date(`${day}T${hhmm}:00Z`);
const open = (over: Record<string, unknown> = {}) => ({
  id: 'pre-1', ticketId: 'ticket-1', authorId: 'u-1', beginning: T('08:30'), ending: null, pausedAt: null, pausedMs: 0,
  limitMinutes: 240, windowEndsAt: T('12:00'), lockedReason: null,
  author: { id: 'u-1', name: 'Ana Consultora', email: 'ana@aponta.test' },
  ticket: { id: 'ticket-1', protocol: 'T-1001', title: 'Erro no ERP' },
  ...over,
});

function setup(rows: unknown[], managers = [{ id: 'g-1', name: 'Gerente', email: 'gerente@aponta.test' }]) {
  const prisma: any = {
    preAppointment: {
      findMany: jest.fn().mockResolvedValue(rows),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const permissions = { usersWithPermission: jest.fn().mockResolvedValue(managers) };
  const mail = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  return { prisma, permissions, mail, service: new WorklogAutoCloseService(prisma, permissions as any, mail as any) };
}

describe('WorklogAutoCloseService (DMTE-462 T4)', () => {
  it('AC-18: busca só os cronômetros abertos', async () => {
    const { service, prisma } = setup([]);
    await expect(service.run(T('12:30'))).resolves.toBe(0);
    expect(prisma.preAppointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ending: null } }));
  });

  it('AC-18 e AC-20: ao atingir o limite fecha com fim = início + duração (08:30 + 4h = 12:30), em hora de Brasília, e trava', async () => {
    const { service, prisma } = setup([open()]);
    await expect(service.run(T('12:30'))).resolves.toBe(1);
    expect(prisma.preAppointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pre-1', ending: null },
      data: { ending: T('12:30'), endTime: '09:30', pausedAt: null, lockedReason: 'LIMIT' },
    });
  });

  it('AC-18: antes do limite não fecha nem avisa', async () => {
    const { service, prisma, mail } = setup([open()]);
    await expect(service.run(T('12:29'))).resolves.toBe(0);
    expect(prisma.preAppointment.updateMany).not.toHaveBeenCalled();
    expect(mail.sendEmail).not.toHaveBeenCalled();
  });

  it('AC-18: sem limite (null) nunca fecha por limite', async () => {
    const { service, prisma } = setup([open({ limitMinutes: null })]);
    await expect(service.run(T('23:00', '2026-11-20'))).resolves.toBe(0);
    expect(prisma.preAppointment.updateMany).not.toHaveBeenCalled();
  });

  it('AC-19 e AC-20: pausa de 2 dias fecha com o tempo trabalhado até a pausa e trava', async () => {
    const { service, prisma } = setup([open({ pausedAt: T('09:00'), windowEndsAt: null })]);
    await service.run(T('09:00', '2026-11-14'));
    expect(prisma.preAppointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pre-1', ending: null },
      data: { ending: T('09:00'), endTime: '06:00', pausedAt: null, lockedReason: 'PAUSE_EXPIRED' },
    });
  });

  it('AC-19 e AC-20: pausado quando a janela fecha, fecha e trava', async () => {
    const { service, prisma } = setup([open({ pausedAt: T('09:00') })]);
    await service.run(T('12:01'));
    expect(prisma.preAppointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lockedReason: 'WINDOW_CLOSED', ending: T('09:00') }) }));
  });

  it('AC-21: avisa por e-mail o consultor e os membros do grupo de aviso, cada um uma vez', async () => {
    const { service, mail, permissions } = setup([open()], [
      { id: 'g-1', name: 'Gerente', email: 'gerente@aponta.test' },
      { id: 'u-1', name: 'Ana Consultora', email: 'ana@aponta.test' },
    ]);
    await service.run(T('12:30'));
    expect(permissions.usersWithPermission).toHaveBeenCalledWith('RECEIVE_WORKLOG_AUTOCLOSE_ALERT');
    const to = mail.sendEmail.mock.calls.map(([options]) => options.to).sort();
    expect(to).toEqual(['ana@aponta.test', 'gerente@aponta.test']);
    const { subject, html } = mail.sendEmail.mock.calls[0][0];
    expect(subject).toMatch(/encerrado/i);
    expect(subject).toContain('T-1001');
    expect(html).toContain('Ana Consultora');
  });

  it('AC-21: se outra instância já fechou (nenhuma linha alterada), não envia e-mail e não conta', async () => {
    const { service, prisma, mail } = setup([open()]);
    prisma.preAppointment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.run(T('12:30'))).resolves.toBe(0);
    expect(mail.sendEmail).not.toHaveBeenCalled();
  });

  it('AC-21: falha de e-mail num destinatário não impede o fechamento nem os outros avisos', async () => {
    const { service, mail } = setup([open(), open({ id: 'pre-2', author: { id: 'u-2', name: 'Bia', email: 'bia@aponta.test' }, authorId: 'u-2' })]);
    mail.sendEmail.mockRejectedValueOnce(new Error('SMTP fora'));
    await expect(service.run(T('12:30'))).resolves.toBe(2);
    expect(mail.sendEmail.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});
