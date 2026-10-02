import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsService } from './checklists.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        {
          provide: PrismaService,
          useValue: {
            ticket: { findUnique: jest.fn() },
            ticketChecklist: {
              findMany: jest.fn(),
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            ticketChecklistItem: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChecklistsService>(ChecklistsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChecklists', () => {
    it('should throw NotFoundException if ticket does not exist', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);
      await expect(service.getChecklists('tkt1')).rejects.toThrow(NotFoundException);
    });

    it('should return checklists for a valid ticket', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 'tkt1' } as any);
      jest.spyOn(prisma.ticketChecklist, 'findMany').mockResolvedValue([{ id: 'chk1', title: 'Test' }] as any);
      const res = await service.getChecklists('tkt1');
      expect(res).toEqual([{ id: 'chk1', title: 'Test' }]);
    });
  });
});
