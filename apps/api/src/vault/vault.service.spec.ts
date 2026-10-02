import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('VaultService', () => {
  let service: VaultService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      credential: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'org-admin' }),
      },
    };
    service = new VaultService(mockPrisma as any);
  });

  describe('create', () => {
    it('should throw ForbiddenException if user is AGENT', async () => {
      const user = { id: 'agent', role: Role.AGENT };
      await expect(service.create({ name: 'teste', password: 'x' }, user))
        .rejects
        .toThrow(ForbiddenException);
    });

    it('should allow ADMIN to create', async () => {
      mockPrisma.credential.create.mockResolvedValue({ id: 'cred' });
      const user = { id: 'admin', role: Role.ADMIN };
      const result = await service.create({ name: 'teste', password: 'x' }, user);
      expect(result).toEqual({ id: 'cred' });
      expect(mockPrisma.credential.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user is CLIENT_MASTER but credential is from another org', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue(null);
      const user = { id: 'c-master', role: Role.CLIENT_MASTER, organizationId: 'org1' };
      await expect(service.remove('cred-123', user))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should allow CLIENT_MASTER to remove if matched', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue({ id: 'cred-123', organizationId: 'org1' });
      const user = { id: 'c-master', role: Role.CLIENT_MASTER, organizationId: 'org1' };
      await service.remove('cred-123', user);
      expect(mockPrisma.credential.delete).toHaveBeenCalledWith({ where: { id: 'cred-123' }});
    });
  });

  describe('findAll', () => {
    it('should throw ForbiddenException if user is CLIENT', async () => {
      const user = { id: 'client', role: Role.CLIENT };
      await expect(service.findAll(user)).rejects.toThrow(ForbiddenException);
    });
  });
});
