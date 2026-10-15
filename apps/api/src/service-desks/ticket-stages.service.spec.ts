import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketStagesService } from './ticket-stages.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  serviceDesk: { findUnique: jest.fn() },
  ticketStage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ticketStageTransition: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  ticket: { count: jest.fn() },
  $transaction: jest.fn(),
};

describe('TicketStagesService', () => {
  let service: TicketStagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketStagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TicketStagesService);
    jest.clearAllMocks();
    mockPrisma.serviceDesk.findUnique.mockResolvedValue({ id: 'desk-1' });
    mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  it('lists stages mapped with transitionToIds', async () => {
    mockPrisma.ticketStage.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Pendente',
        position: 0,
        isInitial: true,
        isFinal: false,
        transitionsFrom: [{ toStageId: 's2' }],
      },
      {
        id: 's2',
        name: 'Fechado',
        position: 1,
        isInitial: false,
        isFinal: true,
        transitionsFrom: [],
      },
    ]);

    const result = await service.list('desk-1');

    expect(result).toEqual([
      {
        id: 's1',
        name: 'Pendente',
        position: 0,
        isInitial: true,
        isFinal: false,
        transitionToIds: ['s2'],
      },
      {
        id: 's2',
        name: 'Fechado',
        position: 1,
        isInitial: false,
        isFinal: true,
        transitionToIds: [],
      },
    ]);
  });

  it('creates a middle stage before the final one', async () => {
    mockPrisma.ticketStage.findMany.mockResolvedValue([
      { id: 'ini', isInitial: true, isFinal: false, position: 0 },
      { id: 'fin', isInitial: false, isFinal: true, position: 1 },
    ]);
    mockPrisma.ticketStage.create.mockResolvedValue({
      id: 'mid',
      name: 'N1',
      position: 1,
      isInitial: false,
      isFinal: false,
      transitionsFrom: [],
    });

    const result = await service.create('desk-1', 'N1');

    expect(mockPrisma.ticketStage.update).toHaveBeenCalledWith({
      where: { id: 'fin' },
      data: { position: 2 },
    });
    expect(mockPrisma.ticketStage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'N1',
          position: 1,
          isInitial: false,
          isFinal: false,
        }),
      }),
    );
    expect(result.name).toBe('N1');
  });

  it('rejects deleting the initial stage', async () => {
    mockPrisma.ticketStage.findFirst.mockResolvedValue({
      id: 'ini',
      isInitial: true,
      isFinal: false,
    });

    await expect(service.remove('desk-1', 'ini')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects deleting a stage in use', async () => {
    mockPrisma.ticketStage.findFirst.mockResolvedValue({
      id: 'mid',
      isInitial: false,
      isFinal: false,
    });
    mockPrisma.ticket.count.mockResolvedValue(2);

    await expect(service.remove('desk-1', 'mid')).rejects.toThrow(
      'Estágio em uso não pode ser excluído',
    );
  });

  it('rejects reorder that moves the initial stage', async () => {
    mockPrisma.ticketStage.findMany.mockResolvedValue([
      { id: 'ini', isInitial: true, isFinal: false },
      { id: 'mid', isInitial: false, isFinal: false },
      { id: 'fin', isInitial: false, isFinal: true },
    ]);

    await expect(
      service.reorder('desk-1', ['mid', 'ini', 'fin']),
    ).rejects.toThrow('Estágio inicial e final não podem ser movidos');
  });

  it('throws when the desk does not exist', async () => {
    mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);
    await expect(service.list('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
