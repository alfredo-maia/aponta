import { ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Role } from '@prisma/client';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
      },
    };
    service = new ArticlesService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('should force isPublic=true to CLIENT', async () => {
      await service.findAll({ id: '1', role: Role.CLIENT });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublic: true } })
      );
    });

    it('should NOT force isPublic to ADMIN', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('remove limitations', () => {
    it('should throw Forbidden if AGENT tries to remove article they do not own', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'xxx', authorId: 'another-user' });
      await expect(service.remove('xxx', { id: 'agent-1', role: Role.AGENT })).rejects.toThrow(ForbiddenException);
    });
  });
});
