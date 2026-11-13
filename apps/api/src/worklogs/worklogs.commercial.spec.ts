import { WorklogsService } from './worklogs.service';
import { Role, ValuationType } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('mandatory commercial authorization', () => {
  const admin = { id: 'tech', role: Role.ADMIN };
  const agent = { id: 'tech', role: Role.AGENT };
  const dto = { startTime: '2026-10-17T12:00:00Z', endTime: '2026-10-17T13:00:00Z', description: 'Trabalho', contractId: 'contract' };
  const term = { id: 'term', approved: true, active: true, effectiveFrom: new Date('2026-10-01T00:00:00Z'), type: 'HOURLY', serviceDeskIds: ['desk'], hourlyRateCents: 15000,
    includedMinutes: null, excessHourlyRateCents: null, monthlyFeeCents: null, fixedPriceCents: null, estimatedMinutes: null };
  let db: any;
  let service: WorklogsService;
  let permissions: { canViewTicketValues: jest.Mock; canEditWorklogStartTime: jest.Mock; hasPermission: jest.Mock };
  let flags: { isEnabled: jest.Mock };
  let approvals: { notifyPending: jest.Mock };
  beforeEach(() => {
    const contract = { id: 'contract', organizationId: 'org', approved: true, active: true, type: 'HOURLY', name: 'Avulso',
      startsAt: new Date('2026-01-01'), endsAt: null, serviceDesks: [{ id: 'desk' }], terms: [term],
      lifecycleEvents: [{ approved: true, active: true, startsAt: new Date('2026-01-01'), endsAt: null, effectiveFrom: new Date('2026-01-01') }] };
    const ticket = { id: 'ticket', serviceDeskId: 'desk', commercialOrganizationId: 'org', commercialOrganization: { id: 'org', name: 'Cliente' },
      requester: { organizationId: 'org', organization: { id: 'org', name: 'Cliente' } }, serviceDesk: { listedGroupsOnly: false, agents: [], agentGroups: [] } };
    db = { $queryRaw: jest.fn().mockResolvedValue([]), $transaction: jest.fn((fn: any) => fn(db)),
      ticket: { findUnique: jest.fn().mockResolvedValue(ticket), update: jest.fn() }, serviceDesk: { findFirst: jest.fn().mockResolvedValue({ id: 'desk' }) },
      contract: { findMany: jest.fn().mockResolvedValue([contract]), findUniqueOrThrow: jest.fn().mockResolvedValue(contract) },
      technicianCostRate: { findMany: jest.fn().mockResolvedValue([{ id: 'cost', effectiveFrom: new Date('2026-01-01'), hourlyCostCents: 10000 }]) },
      worklog: { create: jest.fn(({ data }) => Promise.resolve({ id: 'log', ...data })), update: jest.fn(), delete: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { minutes: 0 } }) },
      preAppointment: { create: jest.fn(({ data }) => Promise.resolve({ id: 'timer', ...data })), delete: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
      appointment: { findMany: jest.fn().mockResolvedValue([]) } };
    permissions = { canViewTicketValues: jest.fn().mockResolvedValue(true), canEditWorklogStartTime: jest.fn().mockResolvedValue(true), hasPermission: jest.fn().mockResolvedValue(true) };
    flags = { isEnabled: jest.fn().mockReturnValue(true) };
    approvals = { notifyPending: jest.fn().mockResolvedValue(undefined) };
    service = new WorklogsService(db, {} as any, {} as any, permissions as any, flags as any, approvals as any);
  });
  it('blocks a company without an explicit desk relationship', async () => {
    db.serviceDesk.findFirst.mockResolvedValue(null);
    await expect(service.create('ticket', dto, admin)).rejects.toThrow(/mesa/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it.each([ValuationType.CONTRACT, ValuationType.MANUAL, ValuationType.GUARANTEE, ValuationType.BONUS])('requires a contract even for %s', async valuationType => {
    db.contract.findMany.mockResolvedValue([]);
    await expect(service.create('ticket', { ...dto, contractId: undefined, valuationType, value: 10, bonusReason: 'Retrabalho' }, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('does not authorize a contract after it was suspended while acquiring its lock', async () => {
    db.contract.findUniqueOrThrow.mockResolvedValue({ ...(await db.contract.findMany())[0], active: false });
    await expect(service.create('ticket', dto, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('records hourly revenue and actual cost snapshots', async () => {
    const result = await service.create('ticket', dto, admin);
    expect(result).toMatchObject({ contractId: 'contract', valueCents: 15000, costCents: 10000 });
    expect(result.valuationSnapshot).toMatchObject({ version: 2, organizationId: 'org', serviceDeskId: 'desk', segments: [expect.objectContaining({ termId: 'term', costRateId: 'cost' })] });
  });
  it('keeps cost for an authorized bonus and excludes its revenue', async () => {
    const result = await service.create('ticket', { ...dto, valuationType: ValuationType.BONUS, bonusReason: 'Erro de desenvolvimento' }, admin);
    expect(result).toMatchObject({ billable: false, valueCents: 0, costCents: 10000, contractId: 'contract' });
  });
  it('forbids bonus authorization by a technician and a reasonless guarantee', async () => {
    await expect(service.create('ticket', { ...dto, valuationType: ValuationType.BONUS, bonusReason: 'Erro' }, agent)).rejects.toThrow(/admin/i);
    await expect(service.create('ticket', { ...dto, valuationType: ValuationType.GUARANTEE }, agent)).rejects.toThrow(/motivo/i);
  });
  it('prevents billable=false from becoming an unapproved bonus bypass', async () => {
    await expect(service.create('ticket', { ...dto, billable: false }, agent)).rejects.toThrow();
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('masks cost and financial memory for technicians', async () => {
    permissions.canViewTicketValues.mockResolvedValue(false);
    const result = await service.create('ticket', dto, agent);
    expect(result).toMatchObject({ valueCents: null, costCents: null, valuationSnapshot: null });
    expect(JSON.stringify(result)).not.toContain('hourlyCostCents');
  });
  it('blocks timer start without commercial authorization', async () => {
    db.contract.findMany.mockResolvedValue([]);
    await expect(service.createPreAppointment('ticket', { beginning: dto.startTime }, admin)).rejects.toThrow(/contrato/i);
    expect(db.preAppointment.create).not.toHaveBeenCalled();
  });
  it('retains a timer contract and allows stopping after contract suspension', async () => {
    const pre = await service.createPreAppointment('ticket', { beginning: dto.startTime, contractId: 'contract' }, admin);
    expect(pre.contractId).toBe('contract');
    db.contract.findMany.mockResolvedValue([]);
    db.preAppointment.findUnique.mockResolvedValue({ ...pre, ticketId: 'ticket', authorId: admin.id });
    db.preAppointment.update.mockResolvedValue({ ...pre, ending: new Date(dto.endTime) });
    await expect(service.stopPreAppointment('ticket', pre.id, { ending: dto.endTime }, admin)).resolves.toBeDefined();
  });
  it('records the raw timer source and prevents a second conversion', async () => {
    db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: admin.id, contractId: 'contract', beginning: new Date('2026-10-17T12:00:35Z'), ending: new Date('2026-10-17T13:00:41Z') });
    const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin);
    expect(result.sourcePreAppointmentId).toBe('timer');
    expect(result.valuationSnapshot).toMatchObject({ sourceBeginning: '2026-10-17T12:00:35.000Z', sourceEnding: '2026-10-17T13:00:41.000Z', sourceContractChanged: false });
    db.worklog.findUnique.mockResolvedValue(result);
    await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin)).rejects.toThrow(/convertido/i);
  });
  it('regularizes a ticket only before its first worklog and only for an admin', async () => {
    await expect(service.setCommercialOrganization('ticket', 'new-org', agent)).rejects.toThrow();
    db.ticket.update.mockResolvedValue({ commercialOrganizationId: 'new-org' });
    await expect(service.setCommercialOrganization('ticket', 'new-org', admin)).resolves.toMatchObject({ commercialOrganizationId: 'new-org' });
    db.worklog.count.mockResolvedValue(1);
    await expect(service.setCommercialOrganization('ticket', 'other-org', admin)).rejects.toThrow(/apontamentos/i);
  });
  it.each([ValuationType.CONTRACT, ValuationType.MANUAL, ValuationType.GUARANTEE, ValuationType.BONUS])('does not accept incomplete historical draft conditions for %s', async valuationType => {
    const draft = { ...(await db.contract.findMany())[0], terms: [{ ...term, hourlyRateCents: null }] };
    db.contract.findMany.mockResolvedValue([draft]);
    await expect(service.create('ticket', { ...dto, valuationType, value: 10, bonusReason: 'Motivo' }, admin)).rejects.toThrow(/contrato/i);
    expect(db.worklog.create).not.toHaveBeenCalled();
  });
  it('records the authorizing administrator separately from the performed-by technician', async () => {
    db.user = { findUnique: jest.fn().mockResolvedValue({ id: 'other-tech', role: Role.AGENT }) };
    const result = await service.create('ticket', { ...dto, authorId: 'other-tech', valuationType: ValuationType.BONUS, bonusReason: 'Correção autorizada' }, admin);
    expect(result.valuationSnapshot).toMatchObject({ authorizedById: admin.id, performedById: 'other-tech', authorizedAt: expect.any(String) });
  });
  it('voids a converted worklog without erasing its snapshot or permitting reconversion; repeat void retains actor/time', async () => {
    db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: admin.id, contractId: 'contract', beginning: new Date(dto.startTime), ending: new Date(dto.endTime) });
    const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin);
    db.worklog.findUnique.mockResolvedValue(result);
    db.worklog.update.mockImplementation(({ data }: any) => Object.assign(result, data));
    const voided = await service.delete('ticket', result.id, admin);
    const originalTime = voided.voidedAt;
    expect(voided.valuationSnapshot).toEqual(result.valuationSnapshot);
    expect(voided.voidedBy).toBe(admin.id);
    await service.delete('ticket', result.id, { id: 'another-admin', role: Role.ADMIN });
    expect(db.worklog.update).toHaveBeenCalledTimes(1);
    expect(voided.voidedAt).toBe(originalTime);
    expect(db.worklog.delete).not.toHaveBeenCalled();
    await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, admin)).rejects.toThrow(/convertido/i);
  });

  describe('DMTE-462 T1: hora inicial e final por permissão EDIT_WORKLOG_START_TIME', () => {
    const timer = { id: 'timer', ticketId: 'ticket', authorId: 'tech', contractId: 'contract', beginning: new Date('2026-10-17T12:00:35Z'), ending: new Date('2026-10-17T13:00:41Z') };
    beforeEach(() => { flags.isEnabled.mockReturnValue(false); });
    afterEach(() => jest.useRealTimers());

    it('AC-01: sem a permissão, recusa lançamento manual', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      await expect(service.create('ticket', dto, agent)).rejects.toThrow(ForbiddenException);
      expect(db.worklog.create).not.toHaveBeenCalled();
    });

    it('AC-01: ADMIN sem a permissão também é recusado (sem desvio por role)', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      await expect(service.create('ticket', dto, admin)).rejects.toThrow(ForbiddenException);
      expect(db.worklog.create).not.toHaveBeenCalled();
    });

    it('AC-01: sem a permissão, recusa converter o cronômetro com início ou fim diferentes dos dele', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      db.preAppointment.findUnique.mockResolvedValue(timer);
      await expect(service.create('ticket', { ...dto, startTime: '2026-10-17T11:00:00Z', preAppointmentId: 'timer' }, agent)).rejects.toThrow(ForbiddenException);
      await expect(service.create('ticket', { ...dto, endTime: '2026-10-17T14:00:00Z', preAppointmentId: 'timer' }, agent)).rejects.toThrow(ForbiddenException);
      expect(db.worklog.create).not.toHaveBeenCalled();
    });

    it('AC-01: sem a permissão, converte o cronômetro quando início e fim caem nos mesmos minutos dele', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      db.preAppointment.findUnique.mockResolvedValue(timer);
      const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent);
      expect(result.sourcePreAppointmentId).toBe('timer');
    });

    it('AC-02: com a permissão, lança manualmente (role AGENT e ADMIN)', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(true);
      await expect(service.create('ticket', dto, agent)).resolves.toMatchObject({ authorId: 'tech' });
      await expect(service.create('ticket', dto, admin)).resolves.toMatchObject({ authorId: 'tech' });
      expect(permissions.canEditWorklogStartTime).toHaveBeenCalledWith('tech');
    });

    it('AC-03: o PLAY sem a permissão ignora início e hora enviados e usa o relógio do servidor', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: new Date('2026-10-17T15:20:30Z') });
      db.appointment.findMany.mockResolvedValue([{ id: 'ag', type: 'AGENDA', ticketId: 'ticket', ignoresWorklogRule: false, startTime: new Date('2026-10-17T14:00:00Z'), endTime: new Date('2026-10-17T18:00:00Z') }]);
      await service.createPreAppointment('ticket', { beginning: '2026-10-17T08:00:00Z', initTime: '05:00', contractId: 'contract' }, agent);
      expect(db.preAppointment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ beginning: new Date('2026-10-17T15:20:30Z'), initTime: '12:20' }),
      }));
    });

    it('AC-03: o PLAY com a permissão aceita o início informado', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(true);
      await service.createPreAppointment('ticket', { beginning: '2026-10-17T08:00:00Z', initTime: '05:00', contractId: 'contract' }, agent);
      expect(db.preAppointment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ beginning: new Date('2026-10-17T08:00:00Z'), initTime: '05:00' }),
      }));
    });

    it('AC-03: parar sem a permissão ignora o fim enviado e usa o relógio do servidor', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: new Date('2026-10-17T13:30:00Z') });
      db.preAppointment.findUnique.mockResolvedValue({ ...timer, ending: null });
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.stopPreAppointment('ticket', 'timer', { ending: '2026-10-17T18:00:00Z', endTime: '15:00' }, agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ ending: new Date('2026-10-17T13:30:00Z'), endTime: '10:30' }),
      }));
    });
  });

  describe('DMTE-462 T2: janela da agenda', () => {
    const NOW = new Date('2026-10-17T15:20:30Z');
    const agendaDoTicket = { id: 'ag', type: 'AGENDA', ticketId: 'ticket', ignoresWorklogRule: false, startTime: new Date('2026-10-17T14:00:00Z'), endTime: new Date('2026-10-17T18:00:00Z') };
    const manual = { ...dto, startTime: '2026-10-17T15:00:00Z', endTime: '2026-10-17T16:00:00Z' };
    beforeEach(() => { permissions.canEditWorklogStartTime.mockResolvedValue(false); flags.isEnabled.mockReturnValue(false); });
    afterEach(() => jest.useRealTimers());

    it('AC-06: o PLAY sem agenda é recusado', async () => {
      jest.useFakeTimers({ now: NOW });
      await expect(service.createPreAppointment('ticket', { contractId: 'contract' }, agent)).rejects.toThrow(/agenda/i);
      expect(db.preAppointment.create).not.toHaveBeenCalled();
    });

    it('AC-06 e AC-10: o PLAY grava a agenda e congela o limite em minutos', async () => {
      jest.useFakeTimers({ now: NOW });
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      await service.createPreAppointment('ticket', { contractId: 'contract' }, agent);
      expect(db.preAppointment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ appointmentId: 'ag', limitMinutes: 240 }),
      }));
    });

    it('AC-06: o lançamento manual dentro da janela é aceito e fica ligado à agenda', async () => {
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      const result = await service.create('ticket', manual, agent);
      expect(result.appointmentId).toBe('ag');
    });

    it('AC-06: o lançamento manual fora da janela é recusado', async () => {
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      await expect(service.create('ticket', { ...manual, startTime: '2026-10-17T19:00:00Z', endTime: '2026-10-17T20:00:00Z' }, agent)).rejects.toThrow(ForbiddenException);
      expect(db.worklog.create).not.toHaveBeenCalled();
    });

    it('AC-07: a soma por agenda não passa da duração dela', async () => {
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 200 } });
      await expect(service.create('ticket', manual, agent)).rejects.toThrow(/limite/i);
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 180 } });
      await expect(service.create('ticket', manual, agent)).resolves.toMatchObject({ appointmentId: 'ag' });
    });

    it('AC-07 e AC-10: converter o cronômetro respeita o limite congelado no PLAY, mesmo com a agenda alterada', async () => {
      db.appointment.findMany.mockResolvedValue([]);
      db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: admin.id, contractId: 'contract', appointmentId: 'ag', limitMinutes: 90,
        beginning: new Date(dto.startTime), ending: new Date(dto.endTime) });
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 45 } });
      await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent)).rejects.toThrow(/limite/i);
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 30 } });
      await expect(service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent)).resolves.toMatchObject({ appointmentId: 'ag' });
    });

    it('AC-08: ausência ou férias bloqueiam o PLAY e o lançamento manual', async () => {
      jest.useFakeTimers({ now: NOW });
      db.appointment.findMany.mockResolvedValue([agendaDoTicket, { ...agendaDoTicket, id: 'ferias', type: 'VACATION', ticketId: null }]);
      await expect(service.createPreAppointment('ticket', { contractId: 'contract' }, agent)).rejects.toThrow(/ausência|férias/i);
      await expect(service.create('ticket', manual, agent)).rejects.toThrow(/ausência|férias/i);
    });

    it('AC-11: o segundo PLAY na mesma agenda é recusado', async () => {
      jest.useFakeTimers({ now: NOW });
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      db.preAppointment.findFirst.mockResolvedValue({ id: 'aberto' });
      await expect(service.createPreAppointment('ticket', { contractId: 'contract' }, agent)).rejects.toThrow(/já há um cronômetro/i);
      expect(db.preAppointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ appointmentId: 'ag', authorId: 'tech', ending: null }) }));
    });

    it('AC-11: o PLAY trava a agenda (FOR UPDATE) antes de conferir cronômetro aberto e limite; quem tem a permissão não trava', async () => {
      jest.useFakeTimers({ now: NOW });
      db.appointment.findMany.mockResolvedValue([agendaDoTicket]);
      await service.createPreAppointment('ticket', { contractId: 'contract' }, agent);
      const comAgenda = db.$queryRaw.mock.calls.length;
      db.$queryRaw.mockClear();
      permissions.canEditWorklogStartTime.mockResolvedValue(true);
      await service.createPreAppointment('ticket', { beginning: '2026-10-17T08:00:00Z', contractId: 'contract' }, agent);
      expect(comAgenda).toBe(db.$queryRaw.mock.calls.length + 1);
    });

    it('AC-13: quem tem a permissão de hora inicial não consulta a agenda no PLAY nem no manual', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(true);
      await service.createPreAppointment('ticket', { beginning: '2026-10-17T08:00:00Z', contractId: 'contract' }, agent);
      await service.create('ticket', dto, agent);
      expect(db.appointment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('DMTE-462 T4: pausa no servidor, relógio e trava', () => {
    const T = (hhmm: string) => new Date(`2026-10-17T${hhmm}:00Z`);
    const open = (over: Record<string, unknown> = {}) => ({ id: 'timer', ticketId: 'ticket', authorId: 'tech', contractId: 'contract', beginning: T('12:00'), ending: null,
      pausedAt: null, pausedMs: 0, limitMinutes: null, windowEndsAt: null, lockedReason: null, ...over });
    afterEach(() => jest.useRealTimers());

    it('AC-17: o PLAY da agenda grava também o fim da janela', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: T('15:20') });
      db.appointment.findMany.mockResolvedValue([{ id: 'ag', type: 'AGENDA', ticketId: 'ticket', ignoresWorklogRule: false, startTime: T('14:00'), endTime: T('18:00') }]);
      await service.createPreAppointment('ticket', { contractId: 'contract' }, agent);
      expect(db.preAppointment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ windowEndsAt: T('18:00') }) }));
    });

    it('AC-17: pausar grava o instante da pausa no servidor', async () => {
      jest.useFakeTimers({ now: T('12:20') });
      db.preAppointment.findUnique.mockResolvedValue(open());
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.pausePreAppointment('ticket', 'timer', agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'timer', ending: null }, data: { pausedAt: T('12:20') } }));
    });

    it('AC-17: retomar soma o tempo parado e limpa a pausa', async () => {
      jest.useFakeTimers({ now: T('12:50') });
      db.preAppointment.findUnique.mockResolvedValue(open({ pausedAt: T('12:20'), pausedMs: 5 * 60_000 }));
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.resumePreAppointment('ticket', 'timer', agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'timer', ending: null }, data: { pausedAt: null, pausedMs: 35 * 60_000 } }));
    });

    it('AC-17: pausar o que já está pausado, retomar o que corre, ou mexer no de outro autor, é recusado', async () => {
      db.preAppointment.findUnique.mockResolvedValue(open({ pausedAt: T('12:20') }));
      await expect(service.pausePreAppointment('ticket', 'timer', agent)).rejects.toThrow(BadRequestException);
      db.preAppointment.findUnique.mockResolvedValue(open());
      await expect(service.resumePreAppointment('ticket', 'timer', agent)).rejects.toThrow(BadRequestException);
      db.preAppointment.findUnique.mockResolvedValue(open({ authorId: 'outro' }));
      await expect(service.pausePreAppointment('ticket', 'timer', agent)).rejects.toThrow(ForbiddenException);
      db.preAppointment.findUnique.mockResolvedValue(open({ ending: T('13:00') }));
      await expect(service.pausePreAppointment('ticket', 'timer', agent)).rejects.toThrow(BadRequestException);
      expect(db.preAppointment.update).not.toHaveBeenCalled();
    });

    it('AC-20: retomar depois que a janela da agenda fechou é recusado (só com aprovação, no T5)', async () => {
      jest.useFakeTimers({ now: T('18:30') });
      db.preAppointment.findUnique.mockResolvedValue(open({ pausedAt: T('15:00'), windowEndsAt: T('18:00') }));
      await expect(service.resumePreAppointment('ticket', 'timer', agent)).rejects.toThrow(ForbiddenException);
    });

    it('AC-17: parar sem a permissão usa o tempo trabalhado: o fim é início + trabalhado, sem as pausas', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: T('13:00') });
      db.preAppointment.findUnique.mockResolvedValue(open({ pausedMs: 10 * 60_000 }));
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.stopPreAppointment('ticket', 'timer', {}, agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ending: T('12:50'), endTime: '09:50' }) }));
    });

    it('AC-17: parar com o cronômetro pausado fecha no instante da pausa', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: T('14:00') });
      db.preAppointment.findUnique.mockResolvedValue(open({ pausedAt: T('12:20') }));
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.stopPreAppointment('ticket', 'timer', {}, agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ending: T('12:20'), pausedAt: null }) }));
    });

    it('AC-20: parar um cronômetro que já foi encerrado (pelo sistema ou por outra aba) é recusado e não muda o fim', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      db.preAppointment.findUnique.mockResolvedValue(open({ ending: T('12:30'), lockedReason: 'LIMIT' }));
      await expect(service.stopPreAppointment('ticket', 'timer', {}, agent)).rejects.toThrow(BadRequestException);
      expect(db.preAppointment.update).not.toHaveBeenCalled();
    });

    it('AC-20: parar depois do fim da janela da agenda encerra e trava (WINDOW_CLOSED)', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: T('18:30') });
      db.preAppointment.findUnique.mockResolvedValue(open({ windowEndsAt: T('18:00') }));
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.stopPreAppointment('ticket', 'timer', {}, agent);
      expect(db.preAppointment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lockedReason: 'WINDOW_CLOSED' }) }));
    });

    it('AC-20: parar dentro da janela não trava', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      jest.useFakeTimers({ now: T('17:30') });
      db.preAppointment.findUnique.mockResolvedValue(open({ windowEndsAt: T('18:00') }));
      db.preAppointment.update.mockResolvedValue({ id: 'timer' });
      await service.stopPreAppointment('ticket', 'timer', {}, agent);
      expect(db.preAppointment.update.mock.calls[0][0].data).not.toHaveProperty('lockedReason');
    });

    it('AC-20: cronômetro encerrado pelo sistema não é removido por quem não tem a permissão de hora inicial', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(false);
      db.preAppointment.findUnique.mockResolvedValue(open({ ending: T('12:30'), lockedReason: 'LIMIT' }));
      await expect(service.deletePreAppointment('ticket', 'timer', agent)).rejects.toThrow(ForbiddenException);
      expect(db.preAppointment.delete).not.toHaveBeenCalled();
    });
  });

  describe('DMTE-462 T5: liberações', () => {
    const T = (hhmm: string) => new Date(`2026-10-17T${hhmm}:00Z`);
    const agenda = { id: 'ag', type: 'AGENDA', ticketId: 'ticket', ignoresWorklogRule: false, startTime: T('14:00'), endTime: T('18:00') };
    const manual = (start: string, end: string) => ({ ...dto, startTime: `2026-10-17T${start}:00Z`, endTime: `2026-10-17T${end}:00Z` });
    const pre = (over: Record<string, unknown> = {}) => ({ id: 'timer', ticketId: 'ticket', authorId: 'tech', contractId: 'contract', appointmentId: 'ag', limitMinutes: 240,
      beginning: new Date(dto.startTime), ending: new Date(dto.endTime), lockedReason: null, ...over });
    const created = () => db.worklog.create.mock.calls[0][0].data;
    beforeEach(() => { permissions.canEditWorklogStartTime.mockResolvedValue(false); });
    afterEach(() => jest.useRealTimers());

    it('AC-22: o manual fora da janela vira pendente do tipo Lançamento, com a regra quebrada no motivo', async () => {
      db.appointment.findMany.mockResolvedValue([agenda]);
      const result = await service.create('ticket', manual('19:00', '20:00'), agent);
      expect(result).toMatchObject({ approvalType: 'LANCAMENTO', approvalStatus: 'PENDING' });
      expect(result.approvalReason).toMatch(/não cai na janela/i);
      expect(result.approvalReason).toContain('A regra:');
      expect(result.approvalReason).toContain('16:00');
      expect(result.approvalReason).toContain('11:00');
      expect(result.approvalReason).toContain('15:00');
    });

    it('AC-22: sem nenhuma agenda, vira pendente e o motivo diz que o ticket não tem agenda', async () => {
      db.appointment.findMany.mockResolvedValue([]);
      const result = await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(result).toMatchObject({ approvalType: 'LANCAMENTO', approvalStatus: 'PENDING' });
      expect(result.approvalReason).toMatch(/não tem agenda/i);
    });

    it('AC-22: em ausência ou férias, vira pendente e o motivo cita as férias', async () => {
      db.appointment.findMany.mockResolvedValue([agenda, { ...agenda, id: 'fer', type: 'VACATION', ticketId: null, startTime: T('00:00'), endTime: T('23:59') }]);
      const result = await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(result).toMatchObject({ approvalType: 'LANCAMENTO', approvalStatus: 'PENDING' });
      expect(result.approvalReason).toMatch(/férias/i);
    });

    it('AC-22: acima do limite da agenda, vira pendente e o motivo traz os números', async () => {
      db.appointment.findMany.mockResolvedValue([agenda]);
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 200 } });
      const result = await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(result).toMatchObject({ approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', appointmentId: 'ag' });
      expect(result.approvalReason).toContain('240 min');
      expect(result.approvalReason).toContain('20 min');
    });

    it('AC-22: converter o cronômetro acima do limite também vira pendente de Lançamento', async () => {
      db.preAppointment.findUnique.mockResolvedValue(pre({ limitMinutes: 90 }));
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 45 } });
      const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent);
      expect(result).toMatchObject({ approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', sourcePreAppointmentId: 'timer' });
    });

    it('AC-22: o PLAY continua recusado fora da janela', async () => {
      jest.useFakeTimers({ now: T('19:00') });
      db.appointment.findMany.mockResolvedValue([agenda]);
      await expect(service.createPreAppointment('ticket', { contractId: 'contract' }, agent)).rejects.toThrow(ForbiddenException);
      expect(db.preAppointment.create).not.toHaveBeenCalled();
    });

    it('AC-23: converter o cronômetro encerrado pelo sistema vira pendente do tipo Cronômetro encerrado, com o mesmo início e fim', async () => {
      db.preAppointment.findUnique.mockResolvedValue(pre({ lockedReason: 'LIMIT' }));
      const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent);
      expect(result).toMatchObject({ approvalType: 'CRONOMETRO_ENCERRADO', approvalStatus: 'PENDING', sourcePreAppointmentId: 'timer', appointmentId: 'ag' });
      expect(result.approvalReason).toMatch(/encerrou/i);
      expect(result.approvalReason).toContain('240 min');
      expect(created().startTime).toEqual(new Date(dto.startTime));
      expect(created().endTime).toEqual(new Date(dto.endTime));
    });

    it('AC-23: o encerrado pelo sistema que também passaria do limite vira um pendente só, do tipo Cronômetro encerrado', async () => {
      db.preAppointment.findUnique.mockResolvedValue(pre({ lockedReason: 'PAUSE_EXPIRED', limitMinutes: 30 }));
      const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent);
      expect(result.approvalType).toBe('CRONOMETRO_ENCERRADO');
      expect(db.worklog.create).toHaveBeenCalledTimes(1);
    });

    it('AC-24: dentro das regras, o apontamento nasce válido, sem campos de liberação, e ninguém é avisado', async () => {
      db.appointment.findMany.mockResolvedValue([agenda]);
      const result = await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(result.approvalType).toBeUndefined();
      expect(created()).not.toHaveProperty('approvalType');
      expect(created()).not.toHaveProperty('approvalStatus');
      expect(approvals.notifyPending).not.toHaveBeenCalled();
    });

    it('AC-24: o pendente é gravado como qualquer outro apontamento, faturável e com valor calculado', async () => {
      db.appointment.findMany.mockResolvedValue([]);
      await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(created()).toMatchObject({ billable: true, minutes: 60, approvalStatus: 'PENDING' });
      expect(created().valueCents).not.toBeUndefined();
    });

    it('AC-29: depois de gravar o pendente, avisa quem libera', async () => {
      db.appointment.findMany.mockResolvedValue([]);
      await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(approvals.notifyPending).toHaveBeenCalledTimes(1);
      expect(approvals.notifyPending).toHaveBeenCalledWith(expect.objectContaining({ approvalType: 'LANCAMENTO', ticketId: 'ticket' }));
    });

    it('AC-29: falha ao avisar não desfaz o apontamento já salvo', async () => {
      db.appointment.findMany.mockResolvedValue([]);
      approvals.notifyPending.mockRejectedValue(new Error('SMTP fora'));
      await expect(service.create('ticket', manual('15:00', '16:00'), agent)).resolves.toMatchObject({ approvalStatus: 'PENDING' });
    });

    it('AC-22: quem tem a permissão de hora inicial não passa por liberação', async () => {
      permissions.canEditWorklogStartTime.mockResolvedValue(true);
      db.appointment.findMany.mockResolvedValue([]);
      const result = await service.create('ticket', manual('15:00', '16:00'), agent);
      expect(result.approvalType).toBeUndefined();
    });

    it('AC-33: com a flag desligada, o cronômetro encerrado converte como no T4, sem liberação', async () => {
      flags.isEnabled.mockReturnValue(false);
      db.preAppointment.findUnique.mockResolvedValue(pre({ lockedReason: 'LIMIT' }));
      const result = await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, agent);
      expect(result.approvalType).toBeUndefined();
      expect(flags.isEnabled).toHaveBeenCalledWith('liberacoes-apontamento');
    });

    it('AC-33: com a flag desligada, o lançamento que quebra regra volta a ser recusado', async () => {
      flags.isEnabled.mockReturnValue(false);
      db.appointment.findMany.mockResolvedValue([]);
      await expect(service.create('ticket', manual('15:00', '16:00'), agent)).rejects.toThrow(ForbiddenException);
      db.appointment.findMany.mockResolvedValue([agenda]);
      db.worklog.aggregate.mockResolvedValue({ _sum: { minutes: 200 } });
      await expect(service.create('ticket', manual('15:00', '16:00'), agent)).rejects.toThrow(/limite/i);
    });
  });
});
