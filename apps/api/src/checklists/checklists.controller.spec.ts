import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';
import { PermissionsService } from '../permissions/permissions.service';

const mockChecklistsService = {
  getChecklists: jest.fn(),
  createChecklist: jest.fn(),
  addChecklistItem: jest.fn(),
  updateChecklistItem: jest.fn(),
  deleteChecklistItem: jest.fn(),
  deleteChecklist: jest.fn(),
};

describe('ChecklistsController', () => {
  let controller: ChecklistsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChecklistsController],
      providers: [
        { provide: ChecklistsService, useValue: mockChecklistsService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ChecklistsController>(ChecklistsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChecklists', () => {
    it('delegates to the service with the ticket id', async () => {
      mockChecklistsService.getChecklists.mockResolvedValue([{ id: 'chk1' }]);

      const result = await controller.getChecklists('tkt1');

      expect(mockChecklistsService.getChecklists).toHaveBeenCalledWith('tkt1');
      expect(result).toEqual([{ id: 'chk1' }]);
    });
  });

  describe('createChecklist', () => {
    it('delegates to the service with ticket id and dto', async () => {
      const dto = { title: 'Steps' } as any;
      mockChecklistsService.createChecklist.mockResolvedValue({ id: 'chk1', ...dto });

      const result = await controller.createChecklist('tkt1', dto);

      expect(mockChecklistsService.createChecklist).toHaveBeenCalledWith('tkt1', dto);
      expect(result).toEqual({ id: 'chk1', ...dto });
    });
  });

  describe('addChecklistItem', () => {
    it('delegates to the service with ticket id, checklist id and dto', async () => {
      const dto = { text: 'Do X' } as any;
      mockChecklistsService.addChecklistItem.mockResolvedValue({ id: 'item1', ...dto });

      const result = await controller.addChecklistItem('tkt1', 'chk1', dto);

      expect(mockChecklistsService.addChecklistItem).toHaveBeenCalledWith('tkt1', 'chk1', dto);
      expect(result).toEqual({ id: 'item1', ...dto });
    });
  });

  describe('updateChecklistItem', () => {
    it('delegates to the service with every id and the dto', async () => {
      const dto = { done: true } as any;
      mockChecklistsService.updateChecklistItem.mockResolvedValue({ id: 'item1', ...dto });

      const result = await controller.updateChecklistItem('tkt1', 'chk1', 'item1', dto);

      expect(mockChecklistsService.updateChecklistItem).toHaveBeenCalledWith(
        'tkt1',
        'chk1',
        'item1',
        dto,
      );
      expect(result).toEqual({ id: 'item1', ...dto });
    });
  });

  describe('deleteChecklistItem', () => {
    it('delegates to the service and returns { success: true }', async () => {
      mockChecklistsService.deleteChecklistItem.mockResolvedValue(undefined);

      const result = await controller.deleteChecklistItem('tkt1', 'chk1', 'item1');

      expect(mockChecklistsService.deleteChecklistItem).toHaveBeenCalledWith('tkt1', 'chk1', 'item1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteChecklist', () => {
    it('delegates to the service and returns { success: true }', async () => {
      mockChecklistsService.deleteChecklist.mockResolvedValue(undefined);

      const result = await controller.deleteChecklist('tkt1', 'chk1');

      expect(mockChecklistsService.deleteChecklist).toHaveBeenCalledWith('tkt1', 'chk1');
      expect(result).toEqual({ success: true });
    });
  });
});
