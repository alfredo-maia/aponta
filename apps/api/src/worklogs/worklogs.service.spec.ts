import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WorklogsService } from './worklogs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('WorklogsService', () => {
  let service: WorklogsService;
  let mockPrisma: {
    ticket: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    worklog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };

  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
  const adminUser: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };
  const clientUser: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };

  const validTicket = { id: 'ticket-1', title: 'Problema no ERP' };

  beforeEach(async () => {
    mockPrisma = {
      ticket: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      worklog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorklogsService>(WorklogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should allow AGENT to create a worklog for themselves', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        minutes: 60,
        description: 'Análise de banco',
        billable: true,
        author: { id: 'agent-1', name: 'Agent One', email: 'agent@test.com' },
      });

      const result = await service.create(
        'ticket-1',
        { minutes: 60, description: 'Análise de banco' },
        agentUser,
      );

      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-1',
          minutes: 60,
          description: 'Análise de banco',
          billable: true,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it('should throw ForbiddenException when AGENT tries to log for another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          { minutes: 30, description: 'Trabalho', authorId: 'other-user' },
          agentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to log work for another user if authorId is provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'agent-2', name: 'Agent Two' });
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-2',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
        minutes: 120,
        description: 'Desenvolvimento',
        billable: false,
      });

      const result = await service.create(
        'ticket-1',
        { minutes: 120, description: 'Desenvolvimento', billable: false, authorId: 'agent-2' },
        adminUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-2',
          minutes: 120,
          description: 'Desenvolvimento',
          billable: false,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.id).toBe('wl-2');
    });

    it('should throw NotFoundException if ADMIN specifies non-existent authorId', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'ticket-1',
          { minutes: 45, description: 'Task', authorId: 'non-existent' },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'invalid-ticket',
          { minutes: 60, description: 'Task' },
          agentUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if CLIENT tries to create a worklog', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          { minutes: 60, description: 'Tentativa cliente' },
          clientUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByTicket', () => {
    it('should return worklogs for valid ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.findMany.mockResolvedValue([
        { id: 'wl-1', minutes: 60, description: 'Log 1' },
      ]);

      const result = await service.findByTicket('ticket-1', agentUser);

      expect(result).toHaveLength(1);
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findByTicket('none', agentUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for CLIENT', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(service.findByTicket('ticket-1', clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should allow AGENT to delete their own worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', agentUser);
      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.delete).toHaveBeenCalledWith({ where: { id: 'wl-1' } });
    });

    it('should forbid AGENT from deleting another user worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to delete any worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', adminUser);
      expect(result.id).toBe('wl-1');
    });

    it('should throw NotFoundException when worklog not found or ticket mismatch', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'other-ticket',
        authorId: 'agent-1',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(NotFoundException);
    });
  });
});
