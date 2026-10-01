import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CsatService } from './csat.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from './decorators/current-user.decorator';

const mockPrismaService = {
  ticket: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const requester: CurrentUserPayload = {
  id: 'client-1',
  role: Role.CLIENT,
};

const otherClient: CurrentUserPayload = {
  id: 'client-2',
  role: Role.CLIENT,
};

describe('CsatService', () => {
  let service: CsatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsatService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CsatService>(CsatService);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when the ticket does not exist', async () => {
    mockPrismaService.ticket.findUnique.mockResolvedValue(null);

    await expect(
      service.rate('missing-ticket', { score: 5 }, requester),
    ).rejects.toThrow(NotFoundException);
    expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the current user is not the ticket requester', async () => {
    mockPrismaService.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      requesterId: 'client-1',
    });

    await expect(
      service.rate('ticket-1', { score: 5 }, otherClient),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
  });

  it('allows the requester to rate their own ticket and persists score+comment', async () => {
    mockPrismaService.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      requesterId: 'client-1',
    });
    mockPrismaService.ticket.update.mockResolvedValue({
      id: 'ticket-1',
      csatScore: 5,
      csatComment: 'Ótimo atendimento',
    });

    const result = await service.rate(
      'ticket-1',
      { score: 5, comment: 'Ótimo atendimento' },
      requester,
    );

    expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { csatScore: 5, csatComment: 'Ótimo atendimento' },
    });
    expect(result.csatScore).toBe(5);
  });

  it('allows rating without a comment', async () => {
    mockPrismaService.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      requesterId: 'client-1',
    });
    mockPrismaService.ticket.update.mockResolvedValue({
      id: 'ticket-1',
      csatScore: 3,
      csatComment: null,
    });

    await service.rate('ticket-1', { score: 3 }, requester);

    expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { csatScore: 3, csatComment: undefined },
    });
  });
});
