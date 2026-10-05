import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { CnpjLookupService } from './cnpj-lookup.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const mockOrganizationsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addAddress: jest.fn(),
  removeAddress: jest.fn(),
  addContact: jest.fn(),
  removeContact: jest.fn(),
};

const mockCnpjLookupService = {
  lookup: jest.fn(),
};

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: CnpjLookupService, useValue: mockCnpjLookupService },
        Reflector,
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it.each([['create'], ['update'], ['remove'], ['lookupCnpj'], ['addAddress'], ['removeAddress'], ['addContact'], ['removeContact']])(
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
    it('delegates to the service without filter when no query param', async () => {
      mockOrganizationsService.findAll.mockResolvedValue([{ id: 'org-1' }]);

      const result = await controller.findAll();

      expect(mockOrganizationsService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([{ id: 'org-1' }]);
    });

    it('converts active=true query param to boolean true (Tiflux-parity, issue #56)', async () => {
      mockOrganizationsService.findAll.mockResolvedValue([{ id: 'org-1', active: true }]);

      const result = await controller.findAll('true');

      expect(mockOrganizationsService.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual([{ id: 'org-1', active: true }]);
    });

    it('converts active=false query param to boolean false', async () => {
      mockOrganizationsService.findAll.mockResolvedValue([{ id: 'org-2', active: false }]);

      const result = await controller.findAll('false');

      expect(mockOrganizationsService.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([{ id: 'org-2', active: false }]);
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

  describe('lookupCnpj', () => {
    it('delegates to the CnpjLookupService with the given cnpj', async () => {
      const lookupResult = { cnpj: '19131243000197', legalName: 'Empresa Teste' } as any;
      mockCnpjLookupService.lookup.mockResolvedValue(lookupResult);

      const result = await controller.lookupCnpj('19131243000197');

      expect(mockCnpjLookupService.lookup).toHaveBeenCalledWith('19131243000197');
      expect(result).toEqual(lookupResult);
    });
  });

  describe('addAddress', () => {
    it('delegates to the service with id and dto', async () => {
      const dto = { city: 'Sao Paulo' } as any;
      mockOrganizationsService.addAddress.mockResolvedValue({ id: 'addr-1', ...dto });

      const result = await controller.addAddress('org-1', dto);

      expect(mockOrganizationsService.addAddress).toHaveBeenCalledWith('org-1', dto);
      expect(result).toEqual({ id: 'addr-1', ...dto });
    });
  });

  describe('removeAddress', () => {
    it('delegates to the service with organization and address id', async () => {
      mockOrganizationsService.removeAddress.mockResolvedValue({ id: 'addr-1' });

      const result = await controller.removeAddress('org-1', 'addr-1');

      expect(mockOrganizationsService.removeAddress).toHaveBeenCalledWith('org-1', 'addr-1');
      expect(result).toEqual({ id: 'addr-1' });
    });
  });

  describe('addContact', () => {
    it('delegates to the service with id and dto', async () => {
      const dto = { name: 'Jane' } as any;
      mockOrganizationsService.addContact.mockResolvedValue({ id: 'contact-1', ...dto });

      const result = await controller.addContact('org-1', dto);

      expect(mockOrganizationsService.addContact).toHaveBeenCalledWith('org-1', dto);
      expect(result).toEqual({ id: 'contact-1', ...dto });
    });
  });

  describe('removeContact', () => {
    it('delegates to the service with organization and contact id', async () => {
      mockOrganizationsService.removeContact.mockResolvedValue({ id: 'contact-1' });

      const result = await controller.removeContact('org-1', 'contact-1');

      expect(mockOrganizationsService.removeContact).toHaveBeenCalledWith('org-1', 'contact-1');
      expect(result).toEqual({ id: 'contact-1' });
    });
  });
});
