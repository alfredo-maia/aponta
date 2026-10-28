import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PermissionsService } from '../permissions/permissions.service';

const mockContractsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ContractsController', () => {
  let controller: ContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        { provide: ContractsService, useValue: mockContractsService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to the service with the current user', async () => {
      const user = { id: 'u1' } as any;
      mockContractsService.findAll.mockResolvedValue([{ id: 'c1' }]);

      const result = await controller.findAll(user);

      expect(mockContractsService.findAll).toHaveBeenCalledWith(user, undefined);
      expect(result).toEqual([{ id: 'c1' }]);
    });
  });

  it('passes search to the scoped list', () => {
    const user = { id: 'u1' } as any;
    controller.findAll(user, 'suporte');
    expect(mockContractsService.findAll).toHaveBeenCalledWith(user, 'suporte');
  });

  it('passes detail and business update requests to the service', () => {
    const user = { id: 'u1' } as any;
    controller.findOne('c1', user);
    controller.updateCommand('c1', { active: false }, user);
    expect(mockContractsService.findOne).toHaveBeenCalledWith('c1', user);
    expect(mockContractsService.update).toHaveBeenCalledWith('c1', { active: false }, user);
  });

  describe('create', () => {
    it('delegates to the service with dto and user', async () => {
      const dto = { organizationId: 'org-1' } as any;
      const user = { id: 'u1' } as any;
      mockContractsService.create.mockResolvedValue({ id: 'c1', ...dto });

      const result = await controller.create(dto, user);

      expect(mockContractsService.create).toHaveBeenCalledWith(dto, user);
      expect(result).toEqual({ id: 'c1', ...dto });
    });
  });

  describe('update', () => {
    it('delegates to the service with id, dto and user', async () => {
      const dto = { monthlyValue: 300 } as any;
      const user = { id: 'u1' } as any;
      mockContractsService.update.mockResolvedValue({ id: 'c1', ...dto });

      const result = await controller.update('c1', dto, user);

      expect(mockContractsService.update).toHaveBeenCalledWith('c1', dto, user);
      expect(result).toEqual({ id: 'c1', ...dto });
    });
  });

  describe('remove', () => {
    it('delegates to the service with id and user', async () => {
      const user = { id: 'u1' } as any;
      mockContractsService.remove.mockResolvedValue({ id: 'c1' });

      const result = await controller.remove('c1', user);

      expect(mockContractsService.remove).toHaveBeenCalledWith('c1', user);
      expect(result).toEqual({ id: 'c1' });
    });
  });
});
