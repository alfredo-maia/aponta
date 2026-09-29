import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockPrismaService: {
    ticket: {
      findUnique: jest.Mock;
    };
    comment: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const clientUser: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };
  const otherClient: CurrentUserPayload = { id: 'client-2', role: Role.CLIENT };
  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
  const adminUser: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };

  const ownedTicket = { id: 'ticket-1', requesterId: 'client-1' };

  beforeEach(async () => {
    mockPrismaService = {
      ticket: {
        findUnique: jest.fn(),
      },
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a comment on a ticket owned by the CLIENT caller', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.create.mockImplementation(({ data }) => ({
        id: 'comment-1',
        createdAt: new Date(),
        ...data,
      }));

      const dto = { content: 'Any update on this?' };
      const result = await service.create('ticket-1', dto, clientUser);

      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: {
          content: dto.content,
          isInternal: false,
          ticketId: 'ticket-1',
          authorId: 'client-1',
        },
      });
      expect(result.isInternal).toBe(false);
    });

    it('should default isInternal to false for AGENT when the DTO omits it', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.create.mockImplementation(({ data }) => data);

      await service.create('ticket-1', { content: 'Looking into it' }, agentUser);

      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isInternal: false }),
      });
    });

    it.each([[Role.AGENT], [Role.ADMIN]])(
      'should let %s create an internal comment (isInternal: true)',
      async (role) => {
        mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
        mockPrismaService.comment.create.mockImplementation(({ data }) => data);

        const user: CurrentUserPayload = { id: `${role}-user`, role };
        await service.create(
          'ticket-1',
          { content: 'Internal note', isInternal: true },
          user,
        );

        expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            isInternal: true,
            authorId: `${role}-user`,
          }),
        });
      },
    );

    it('should force isInternal to false when a CLIENT sends isInternal: true (never trust the client-supplied flag)', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.create.mockImplementation(({ data }) => data);

      await service.create(
        'ticket-1',
        { content: 'Sneaky', isInternal: true },
        clientUser,
      );

      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isInternal: false }),
      });
    });

    it('should throw NotFoundException when the ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nope', { content: 'hi' }, agentUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.comment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException (not Forbidden) when a CLIENT comments on a ticket they do not own', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);

      await expect(
        service.create('ticket-1', { content: 'hi' }, otherClient),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.comment.create).not.toHaveBeenCalled();
    });

    it('should let an AGENT comment on a ticket they do not own', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.create.mockImplementation(({ data }) => data);

      await service.create('ticket-1', { content: 'Agent reply' }, agentUser);

      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ authorId: 'agent-1' }),
      });
    });
  });

  describe('findByTicket', () => {
    it('should return all comments (including internal) for AGENT', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      const comments = [
        { id: 'c1', isInternal: false },
        { id: 'c2', isInternal: true },
      ];
      mockPrismaService.comment.findMany.mockResolvedValue(comments);

      const result = await service.findByTicket('ticket-1', agentUser);

      expect(mockPrismaService.comment.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(comments);
    });

    it('should return all comments (including internal) for ADMIN', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.findMany.mockResolvedValue([]);

      await service.findByTicket('ticket-1', adminUser);

      expect(mockPrismaService.comment.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should filter out internal comments for a CLIENT reader (isInternal: false in the query)', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);
      mockPrismaService.comment.findMany.mockResolvedValue([
        { id: 'c1', isInternal: false },
      ]);

      const result = await service.findByTicket('ticket-1', clientUser);

      expect(mockPrismaService.comment.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1', isInternal: false },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual([{ id: 'c1', isInternal: false }]);
    });

    it('should throw NotFoundException when the ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.findByTicket('nope', agentUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.comment.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException (not Forbidden) when a CLIENT reads comments on a ticket they do not own', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(ownedTicket);

      await expect(
        service.findByTicket('ticket-1', otherClient),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.comment.findMany).not.toHaveBeenCalled();
    });
  });
});
