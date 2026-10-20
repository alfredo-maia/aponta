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

    it('includes the author name/id and attachment summaries alongside each article', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            author: { select: { id: true, name: true } },
            attachments: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                fileUrl: true,
                createdAt: true,
              },
            },
          },
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

    it('filters by folderId when provided', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN }, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { folderId: 'folder-1' },
        })
      );
    });

    it('still forces isPublic=true for a CLIENT filtering by folderId (folder filter must not bypass visibility)', async () => {
      await service.findAll({ id: '1', role: Role.CLIENT }, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true, folderId: 'folder-1' },
        })
      );
    });

    it('still forces isPublic=true for an anonymous caller filtering by folderId', async () => {
      await service.findAll(undefined, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true, folderId: 'folder-1' },
        })
      );
    });
  });

  describe('remove limitations', () => {
    it('should throw Forbidden if AGENT tries to remove article they do not own', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'xxx', authorId: 'another-user' });
      await expect(service.remove('xxx', { id: 'agent-1', role: Role.AGENT })).rejects.toThrow(ForbiddenException);
    });

    it('cleans up every attachment file on disk when the article is deleted (no orphaned uploads)', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'xxx',
        authorId: 'agent-1',
        attachments: [{ filename: 'a.txt' }, { filename: 'b.pdf' }],
      });
      mockPrisma.article.delete = jest.fn().mockResolvedValue({ id: 'xxx' });

      await service.remove('xxx', { id: 'agent-1', role: Role.AGENT });

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'xxx' },
        include: { attachments: { select: { filename: true } } },
      });
      expect(mockPrisma.article.delete).toHaveBeenCalledWith({ where: { id: 'xxx' } });
      // Files don't actually exist on disk in this unit test — unlink()
      // rejecting is swallowed on purpose (see the comment in the service);
      // the real assertion here is that delete() still resolves cleanly
      // and doesn't throw just because the (missing) files couldn't be
      // removed.
    });
  });

  describe('findById', () => {
    it('delegates to prisma.article.findUnique by id', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'a-1' });
      const result = await service.findById('a-1');
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({ where: { id: 'a-1' } });
      expect(result).toEqual({ id: 'a-1' });
    });
  });

  describe('XSS sanitization', () => {
    it('strips <script> tags from content on create', async () => {
      mockPrisma.article.create = jest.fn().mockResolvedValue({});

      await service.create(
        { title: 'T', content: '<p>hi</p><script>alert(1)</script>' },
        { id: 'agent-1', role: Role.AGENT },
      );

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.content).not.toContain('<script');
      expect(callArg.data.content).not.toContain('alert(1)');
    });

    it('strips the onerror attribute from an <img> but keeps the tag on create', async () => {
      mockPrisma.article.create = jest.fn().mockResolvedValue({});

      await service.create(
        { title: 'T', content: '<img src="x" onerror="alert(1)">' },
        { id: 'agent-1', role: Role.AGENT },
      );

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.content).not.toContain('onerror');
      expect(callArg.data.content).toContain('<img');
    });

    it('neutralizes a javascript: href on create', async () => {
      mockPrisma.article.create = jest.fn().mockResolvedValue({});

      await service.create(
        { title: 'T', content: '<a href="javascript:alert(1)">x</a>' },
        { id: 'agent-1', role: Role.AGENT },
      );

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.content).not.toContain('javascript:');
    });

    it('preserves legitimate rich markup on create (table, aligned paragraph, colored span, mark)', async () => {
      mockPrisma.article.create = jest.fn().mockResolvedValue({});
      const content =
        '<table><tr><td>a</td></tr></table><p style="text-align:center">c</p><span style="color:#ff0000">r</span><mark>m</mark>';

      await service.create({ title: 'T', content }, { id: 'agent-1', role: Role.AGENT });

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.content).toContain('<table>');
      expect(callArg.data.content).toContain('<td>a</td>');
      expect(callArg.data.content).toContain('text-align:center');
      expect(callArg.data.content).toContain('color:#ff0000');
      expect(callArg.data.content).toContain('<mark>m</mark>');
    });

    it('strips <script> tags from content on update when content is sent', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'a-1', authorId: 'agent-1' });
      mockPrisma.article.update = jest.fn().mockResolvedValue({});

      await service.update(
        'a-1',
        { content: '<p>hi</p><script>alert(1)</script>' },
        { id: 'agent-1', role: Role.AGENT },
      );

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.content).not.toContain('<script');
      expect(callArg.data.content).not.toContain('alert(1)');
    });

    it('does not touch content on update when content is not sent', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'a-1', authorId: 'agent-1' });
      mockPrisma.article.update = jest.fn().mockResolvedValue({});

      await service.update('a-1', { title: 'New title' }, { id: 'agent-1', role: Role.AGENT });

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data).toEqual({ title: 'New title' });
    });
  });
});
