import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorklogApprovalsService } from './worklog-approvals.service';
import { WorklogsService } from './worklogs.service';
import { RejectWorklogApprovalDto } from './dto/reject-worklog-approval.dto';

describe('achados do code-review do T5 (DMTE-462)', () => {
  describe('AC-25: o corpo de negar é validado', () => {
    it('recusa motivo que não é texto e aceita texto ou ausência', async () => {
      expect(await validate(plainToInstance(RejectWorklogApprovalDto, { note: 5 }))).not.toHaveLength(0);
      expect(await validate(plainToInstance(RejectWorklogApprovalDto, { note: 'x'.repeat(1001) }))).not.toHaveLength(0);
      expect(await validate(plainToInstance(RejectWorklogApprovalDto, { note: 'Horário não confere' }))).toHaveLength(0);
      expect(await validate(plainToInstance(RejectWorklogApprovalDto, {}))).toHaveLength(0);
    });
  });

  describe('AC-26: ninguém decide o que ele mesmo lançou em nome de outro', () => {
    const user = { id: 'admin-1', role: Role.ADMIN };
    const pending = { id: 'w-1', authorId: 'u-9', approvalRequestedBy: 'admin-1', approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', voidedAt: null,
      ticket: { protocol: 'T-1', title: 'Erro' }, author: { id: 'u-9', name: 'Ana', email: 'ana@aponta.test' } };
    const setup = () => {
      const prisma: any = { worklog: { findUnique: jest.fn().mockResolvedValue(pending), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
      const permissions = { hasPermission: jest.fn().mockResolvedValue(true) };
      const mail = { sendEmail: jest.fn().mockResolvedValue(undefined) };
      return { prisma, service: new WorklogApprovalsService(prisma, permissions as any, mail as any, { notify: jest.fn().mockResolvedValue(undefined) } as any) };
    };

    it('quem lançou em nome do consultor não libera nem nega, mesmo com a permissão', async () => {
      const { service, prisma } = setup();
      await expect(service.approve('w-1', user)).rejects.toThrow(ForbiddenException);
      await expect(service.reject('w-1', 'motivo', user)).rejects.toThrow(ForbiddenException);
      expect(prisma.worklog.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('WorklogsService.create', () => {
    const term = { id: 'term', approved: true, active: true, effectiveFrom: new Date('2026-10-01T00:00:00Z'), type: 'HOURLY', serviceDeskIds: ['desk'], hourlyRateCents: 15000,
      includedMinutes: null, excessHourlyRateCents: null, monthlyFeeCents: null, fixedPriceCents: null, estimatedMinutes: null };
    const dto = { startTime: '2026-10-17T12:00:00Z', endTime: '2026-10-17T13:00:00Z', description: 'Trabalho', contractId: 'contract' };
    let db: any;
    let service: WorklogsService;
    beforeEach(() => {
      const contract = { id: 'contract', organizationId: 'org', approved: true, active: true, type: 'HOURLY', name: 'Avulso',
        startsAt: new Date('2026-01-01'), endsAt: null, serviceDesks: [{ id: 'desk' }], terms: [term],
        lifecycleEvents: [{ approved: true, active: true, startsAt: new Date('2026-01-01'), endsAt: null, effectiveFrom: new Date('2026-01-01') }] };
      const ticket = { id: 'ticket', serviceDeskId: 'desk', commercialOrganizationId: 'org', commercialOrganization: { id: 'org', name: 'Cliente' },
        requester: { organizationId: 'org', organization: { id: 'org', name: 'Cliente' } }, serviceDesk: { listedGroupsOnly: false, agents: [], agentGroups: [] } };
      db = { $queryRaw: jest.fn().mockResolvedValue([]), $transaction: jest.fn((fn: any) => fn(db)),
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-9', role: Role.AGENT }) },
        ticket: { findUnique: jest.fn().mockResolvedValue(ticket), update: jest.fn() }, serviceDesk: { findFirst: jest.fn().mockResolvedValue({ id: 'desk' }) },
        contract: { findMany: jest.fn().mockResolvedValue([contract]), findUniqueOrThrow: jest.fn().mockResolvedValue(contract) },
        technicianCostRate: { findMany: jest.fn().mockResolvedValue([{ id: 'cost', effectiveFrom: new Date('2026-01-01'), hourlyCostCents: 10000 }]) },
        worklog: { create: jest.fn(({ data }) => Promise.resolve({ id: 'log', ...data })), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({ _sum: { minutes: 0 } }) },
        preAppointment: { findUnique: jest.fn() }, appointment: { findMany: jest.fn().mockResolvedValue([]) } };
      const permissions = { canViewTicketValues: jest.fn().mockResolvedValue(true), canEditWorklogStartTime: jest.fn().mockResolvedValue(false), hasPermission: jest.fn().mockResolvedValue(true) };
      service = new WorklogsService(db, {} as any, {} as any, permissions as any, { isEnabled: jest.fn().mockReturnValue(true) } as any, { notifyPending: jest.fn().mockResolvedValue(undefined) } as any);
    });

    it('AC-26: o pendente guarda quem lançou, para o ADMIN que lança em nome de outro não decidir depois', async () => {
      const result = await service.create('ticket', { ...dto, authorId: 'u-9' }, { id: 'admin-1', role: Role.ADMIN });
      expect(result).toMatchObject({ authorId: 'u-9', approvalStatus: 'PENDING', approvalRequestedBy: 'admin-1' });
    });

    it('AC-22: a conversão confere o limite com a linha da agenda travada, como o lançamento manual', async () => {
      db.preAppointment.findUnique.mockResolvedValue({ id: 'timer', ticketId: 'ticket', authorId: 'tech', contractId: 'contract', appointmentId: 'ag', limitMinutes: 240,
        beginning: new Date(dto.startTime), ending: new Date(dto.endTime), lockedReason: null });
      await service.create('ticket', { ...dto, preAppointmentId: 'timer' }, { id: 'tech', role: Role.AGENT });
      const locked = db.$queryRaw.mock.calls.map((call: any[]) => (call[0].strings ?? call[0]).join(' '));
      expect(locked.some((text: string) => text.includes('"Appointment"'))).toBe(true);
    });
  });
});
