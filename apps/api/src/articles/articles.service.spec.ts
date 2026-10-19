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

    it('includes the author name/id alongside each article', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { author: { select: { id: true, name: true } } },
        })
      );
    });

    it('defaults to ordering by last updated (most recent first)', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { updatedAt: 'desc' } })
      );
    });

    it('sorts by title ascending/descending when requested', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN }, { sort: 'title_asc' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } })
      );

      await service.findAll({ id: '2', role: Role.ADMIN }, { sort: 'title_desc' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'desc' } })
      );
    });

    it('filters by any of several comma-separated tags (OR semantics)', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN }, { tags: 'senha, ajuda' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tags: { hasSome: ['senha', 'ajuda'] } },
        })
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
