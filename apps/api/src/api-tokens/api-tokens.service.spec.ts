import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';

describe('ApiTokensService', () => {
  let service: ApiTokensService;
  let mockPrisma: any;

  const user = { id: 'user-1', role: 'ADMIN', organizationId: null } as any;

  beforeEach(() => {
    mockPrisma = {
      apiToken: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'token-1',
            name: data.name,
            prefix: data.prefix,
            tokenHash: data.tokenHash,
            userId: data.userId,
            lastUsedAt: null,
            createdAt: new Date('2026-01-01'),
          })
        ),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ApiTokensService(mockPrisma as any);
  });

  describe('create', () => {
    it('should return the plain token only once, never persisting it unhashed', async () => {
      const result = await service.create(user, 'Claude Desktop');

      expect(result.token).toMatch(/^apta_[a-f0-9]{64}$/);

      const persistedCall = mockPrisma.apiToken.create.mock.calls[0][0];
      expect(persistedCall.data.tokenHash).not.toBe(result.token);
      expect(persistedCall.data).not.toHaveProperty('token');
    });
  });

  describe('findAll', () => {
    it('should never project tokenHash or prefix to the caller', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        {
          id: 't1',
          name: 'My Token',
          prefix: 'apta_abc123',
          tokenHash: 'super-secret-hash',
          userId: 'user-1',
          lastUsedAt: null,
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const result = await service.findAll(user);
      expect(result[0]).not.toHaveProperty('tokenHash');
      expect(result[0]).not.toHaveProperty('prefix');
      expect(result[0]).not.toHaveProperty('token');
    });
  });

  describe('revoke', () => {
    it('should throw NotFoundException when token does not exist', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue(null);
      await expect(service.revoke('nope', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when revoking another user token', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue({ id: 't1', userId: 'another-user' });
      await expect(service.revoke('t1', user)).rejects.toThrow(ForbiddenException);
    });

    it('should delete when the token belongs to the caller', async () => {
      mockPrisma.apiToken.findUnique.mockResolvedValue({ id: 't1', userId: user.id });
      const result = await service.revoke('t1', user);
      expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(result).toEqual({ success: true });
    });
  });
});
