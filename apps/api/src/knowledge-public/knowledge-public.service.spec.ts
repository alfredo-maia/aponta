import { NotFoundException } from '@nestjs/common';
import { ArticleVisibility } from '@prisma/client';
import { PublicKnowledgeService } from './knowledge-public.service';

describe('PublicKnowledgeService (S4.1)', () => {
  let service: PublicKnowledgeService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      knowledgeFolder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new PublicKnowledgeService(mockPrisma as any);
  });

  describe('findAllArticles (AC-01, AC-03, AC-04)', () => {
    it('only ever queries visibility=PUBLIC, fixed, never taking a visibility param from the caller', async () => {
      await service.findAllArticles();

      const call = mockPrisma.article.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ visibility: ArticleVisibility.PUBLIC });
    });

    it('never returns a PRIVATE article, even if one is present in the dataset returned by Prisma (defense in depth)', async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        {
          id: 'pub-1',
          title: 'Público',
          content: '<p>ok</p>',
          visibility: ArticleVisibility.PUBLIC,
          tags: [],
          folder: null,
          attachments: [],
          updatedAt: new Date('2026-01-01'),
          author: { id: 'u-1', name: 'Autor' },
          authorId: 'u-1',
        },
        {
          id: 'priv-1',
          title: 'Privado',
          content: '<p>segredo</p>',
          visibility: ArticleVisibility.PRIVATE,
          tags: [],
          folder: null,
          attachments: [],
          updatedAt: new Date('2026-01-01'),
          author: { id: 'u-2', name: 'Autor2' },
          authorId: 'u-2',
        },
      ]);

      const result = await service.findAllArticles();

      expect(result.some((a: any) => a.id === 'priv-1')).toBe(false);
      expect(result.every((a: any) => !('visibility' in a) || a.visibility !== ArticleVisibility.PRIVATE)).toBe(true);
    });

    it('allowlists the output DTO (AC-04): never exposes author/authorId/ACL/catalog/autoShare/createdAt', async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        {
          id: 'pub-1',
          title: 'Público',
          content: '<p>ok</p>',
          visibility: ArticleVisibility.PUBLIC,
          tags: ['a'],
          folderId: 'f-1',
          folder: { id: 'f-1', name: 'Pasta', icon: '📁' },
          attachments: [{ id: 'att-1', originalName: 'x.pdf', mimeType: 'application/pdf', filename: 'uuid.pdf', fileUrl: 'uuid.pdf' }],
          updatedAt: new Date('2026-01-01'),
          createdAt: new Date('2025-01-01'),
          author: { id: 'u-1', name: 'Autor' },
          authorId: 'u-1',
          allowedAgentGroups: [{ id: 'g-1' }],
          allowedOrganizations: [{ id: 'o-1' }],
          serviceCatalogItems: [{ id: 'c-1' }],
          autoShareWithNewOrganizations: true,
        },
      ]);

      const [article] = (await service.findAllArticles()) as any[];

      expect(Object.keys(article).sort()).toEqual(
        ['attachments', 'content', 'folder', 'id', 'tags', 'title', 'updatedAt'].sort(),
      );
      expect(Object.keys(article.attachments[0]).sort()).toEqual(
        ['id', 'mimeType', 'originalName'].sort(),
      );
    });

    it('filters by folderId when provided', async () => {
      await service.findAllArticles({ folderId: 'f-1' });

      const call = mockPrisma.article.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ visibility: ArticleVisibility.PUBLIC, folderId: 'f-1' });
    });
  });

  describe('findOneArticle (AC-02 — uniform 404)', () => {
    it('returns the article when it is PUBLIC', async () => {
      mockPrisma.article.findFirst.mockResolvedValue({
        id: 'pub-1',
        title: 'Público',
        content: '<p>ok</p>',
        visibility: ArticleVisibility.PUBLIC,
        tags: [],
        folder: null,
        attachments: [],
        updatedAt: new Date('2026-01-01'),
      });

      const result: any = await service.findOneArticle('pub-1');
      expect(result.id).toBe('pub-1');
    });

    it('throws NotFoundException for a PRIVATE article id — the query itself never matches it', async () => {
      // findFirst is scoped to visibility=PUBLIC in the where clause, so a
      // PRIVATE row simply never matches, regardless of what mockPrisma
      // would return for an unscoped lookup.
      mockPrisma.article.findFirst.mockResolvedValue(null);

      await expect(service.findOneArticle('priv-1')).rejects.toThrow(NotFoundException);
      const call = mockPrisma.article.findFirst.mock.calls[0][0];
      expect(call.where).toMatchObject({ id: 'priv-1', visibility: ArticleVisibility.PUBLIC });
    });

    it('throws the exact same NotFoundException for a nonexistent id (anti-enumeration)', async () => {
      mockPrisma.article.findFirst.mockResolvedValue(null);

      await expect(service.findOneArticle('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllFolders (AC-05)', () => {
    it('only returns folders that have at least one PUBLIC article', async () => {
      await service.findAllFolders();

      const call = mockPrisma.knowledgeFolder.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({
        articles: { some: { visibility: ArticleVisibility.PUBLIC } },
      });
    });

    it('counts only PUBLIC articles per folder, not the total', async () => {
      mockPrisma.knowledgeFolder.findMany.mockResolvedValue([
        { id: 'f-1', name: 'Pasta', icon: '📁', _count: { articles: 2 } },
      ]);

      const [folder]: any = await service.findAllFolders();

      const call = mockPrisma.knowledgeFolder.findMany.mock.calls[0][0];
      expect(call.include._count.select.articles.where).toEqual({
        visibility: ArticleVisibility.PUBLIC,
      });
      expect(folder.articleCount).toBe(2);
    });
  });
});
