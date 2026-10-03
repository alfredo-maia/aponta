import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const mockOrganizationsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationsService, useValue: mockOrganizationsService }, Reflector],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it.each([['create'], ['update'], ['remove']])(
      'requires ADMIN on %s',
      (methodName) => {
        expect(Reflect.getMetadata(ROLES_KEY, (controller as any)[methodName])).toEqual([
          Role.ADMIN,
        ]);
      },
    );

    it('findAll has NO role restriction (any authenticated user)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toBeUndefined();
    });

    it('findOne has NO role restriction (any authenticated user)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toBeUndefined();
    });
  });

  describe('create', () => {
    it('delegates to the service with the given dto', async () => {
      const dto = { name: 'Acme Corp' } as any;
      mockOrganizationsService.create.mockResolvedValue({ id: 'org-1', ...dto });

      const result = await controller.create(dto);

      expect(mockOrganizationsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'org-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('delegates to the service', async () => {
      mockOrganizationsService.findAll.mockResolvedValue([{ id: 'org-1' }]);

      const result = await controller.findAll();

      expect(mockOrganizationsService.findAll).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'org-1' }]);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the given id', async () => {
      mockOrganizationsService.findOne.mockResolvedValue({ id: 'org-1' });

      const result = await controller.findOne('org-1');

      expect(mockOrganizationsService.findOne).toHaveBeenCalledWith('org-1');
      expect(result).toEqual({ id: 'org-1' });
    });
  });

  describe('update', () => {
    it('delegates to the service with id and dto', async () => {
      const dto = { name: 'New Name' } as any;
      mockOrganizationsService.update.mockResolvedValue({ id: 'org-1', ...dto });

      const result = await controller.update('org-1', dto);

      expect(mockOrganizationsService.update).toHaveBeenCalledWith('org-1', dto);
      expect(result).toEqual({ id: 'org-1', ...dto });
    });
  });

  describe('remove', () => {
    it('delegates to the service with the given id', async () => {
      mockOrganizationsService.remove.mockResolvedValue({ id: 'org-1' });

      const result = await controller.remove('org-1');

      expect(mockOrganizationsService.remove).toHaveBeenCalledWith('org-1');
      expect(result).toEqual({ id: 'org-1' });
    });
  });
});
