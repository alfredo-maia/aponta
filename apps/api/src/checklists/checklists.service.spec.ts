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

  describe('createChecklist', () => {
    it('throws NotFoundException if the ticket does not exist', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);
      await expect(service.createChecklist('tkt1', { title: 'Steps' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ticketChecklist.create).not.toHaveBeenCalled();
    });

    it('creates the checklist with items included when the ticket exists', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 'tkt1' } as any);
      jest
        .spyOn(prisma.ticketChecklist, 'create')
        .mockResolvedValue({ id: 'chk1', title: 'Steps', items: [] } as any);

      const result = await service.createChecklist('tkt1', { title: 'Steps' } as any);

      expect(prisma.ticketChecklist.create).toHaveBeenCalledWith({
        data: { title: 'Steps', ticketId: 'tkt1' },
        include: { items: true },
      });
      expect(result).toEqual({ id: 'chk1', title: 'Steps', items: [] });
    });
  });

  describe('addChecklistItem', () => {
    it('throws NotFoundException if the checklist does not exist (or belongs to another ticket)', async () => {
      jest.spyOn(prisma.ticketChecklist, 'findUnique').mockResolvedValue(null);
      await expect(
        service.addChecklistItem('tkt1', 'chk1', { text: 'Do X' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.ticketChecklistItem.create).not.toHaveBeenCalled();
    });

    it('creates the item when the checklist exists', async () => {
      jest.spyOn(prisma.ticketChecklist, 'findUnique').mockResolvedValue({ id: 'chk1' } as any);
      jest
        .spyOn(prisma.ticketChecklistItem, 'create')
        .mockResolvedValue({ id: 'item1', text: 'Do X', checklistId: 'chk1' } as any);

      const result = await service.addChecklistItem('tkt1', 'chk1', { text: 'Do X' } as any);

      expect(prisma.ticketChecklistItem.create).toHaveBeenCalledWith({
        data: { text: 'Do X', checklistId: 'chk1' },
      });
      expect(result).toEqual({ id: 'item1', text: 'Do X', checklistId: 'chk1' });
    });
  });

  describe('updateChecklistItem', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue(null);
      await expect(
        service.updateChecklistItem('tkt1', 'chk1', 'item1', { done: true } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.ticketChecklistItem.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the item belongs to a checklist of a DIFFERENT ticket (cross-tenant guard)', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue({
        id: 'item1',
        checklist: { ticketId: 'some-other-ticket' },
      } as any);
      await expect(
        service.updateChecklistItem('tkt1', 'chk1', 'item1', { done: true } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.ticketChecklistItem.update).not.toHaveBeenCalled();
    });

    it('updates the item when it belongs to the given ticket', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue({
        id: 'item1',
        checklist: { ticketId: 'tkt1' },
      } as any);
      jest
        .spyOn(prisma.ticketChecklistItem, 'update')
        .mockResolvedValue({ id: 'item1', done: true } as any);

      const result = await service.updateChecklistItem('tkt1', 'chk1', 'item1', {
        done: true,
      } as any);

      expect(prisma.ticketChecklistItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { done: true },
      });
      expect(result).toEqual({ id: 'item1', done: true });
    });
  });

  describe('deleteChecklistItem', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue(null);
      await expect(service.deleteChecklistItem('tkt1', 'chk1', 'item1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ticketChecklistItem.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the item belongs to a different ticket (cross-tenant guard)', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue({
        id: 'item1',
        checklist: { ticketId: 'some-other-ticket' },
      } as any);
      await expect(service.deleteChecklistItem('tkt1', 'chk1', 'item1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ticketChecklistItem.delete).not.toHaveBeenCalled();
    });

    it('deletes the item when it belongs to the given ticket', async () => {
      jest.spyOn(prisma.ticketChecklistItem, 'findUnique').mockResolvedValue({
        id: 'item1',
        checklist: { ticketId: 'tkt1' },
      } as any);

      await service.deleteChecklistItem('tkt1', 'chk1', 'item1');

      expect(prisma.ticketChecklistItem.delete).toHaveBeenCalledWith({ where: { id: 'item1' } });
    });
  });

  describe('deleteChecklist', () => {
    it('throws NotFoundException when the checklist does not exist (or belongs to another ticket)', async () => {
      jest.spyOn(prisma.ticketChecklist, 'findUnique').mockResolvedValue(null);
      await expect(service.deleteChecklist('tkt1', 'chk1')).rejects.toThrow(NotFoundException);
      expect(prisma.ticketChecklist.delete).not.toHaveBeenCalled();
    });

    it('deletes the checklist when it exists', async () => {
      jest.spyOn(prisma.ticketChecklist, 'findUnique').mockResolvedValue({ id: 'chk1' } as any);

      await service.deleteChecklist('tkt1', 'chk1');

      expect(prisma.ticketChecklist.delete).toHaveBeenCalledWith({ where: { id: 'chk1' } });
    });
  });
});
