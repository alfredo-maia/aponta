import { ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticleVisibility, Role } from '@prisma/client';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
      },
    };
    service = new ArticlesService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('restricts an anonymous/unauthenticated caller to PUBLIC articles', async () => {
      await service.findAll(undefined);
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ visibility: 'PUBLIC' }] },
        })
      );
    });

    it('restricts a CLIENT to PUBLIC articles plus PRIVATE ones they authored or whose organization is allowed', async () => {
      await service.findAll({ id: 'client-1', role: Role.CLIENT, organizationId: 'org-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PRIVATE',
                OR: [
                  { authorId: 'client-1' },
                  { allowedAgentGroups: { some: { members: { some: { id: 'client-1' } } } } },
                  { allowedOrganizations: { some: { id: 'org-1' } } },
                ],
              },
            ],
          },
        })
      );
    });

    it('does not add the allowedOrganizations condition for a CLIENT without an organizationId', async () => {
      await service.findAll({ id: 'client-1', role: Role.CLIENT, organizationId: null });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PRIVATE',
                OR: [
                  { authorId: 'client-1' },
                  { allowedAgentGroups: { some: { members: { some: { id: 'client-1' } } } } },
                ],
              },
            ],
          },
        })
      );
    });

    it('now ALSO restricts AGENT/AGENT_MASTER to the same PUBLIC + ACL rule as CLIENT (behavior change from the old isPublic rule)', async () => {
      await service.findAll({ id: 'agent-1', role: Role.AGENT });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PRIVATE',
                OR: [
                  { authorId: 'agent-1' },
                  { allowedAgentGroups: { some: { members: { some: { id: 'agent-1' } } } } },
                ],
              },
            ],
          },
        })
      );

      await service.findAll({ id: 'master-1', role: Role.AGENT_MASTER });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { visibility: 'PUBLIC' },
              {
                visibility: 'PRIVATE',
                OR: [
                  { authorId: 'master-1' },
                  { allowedAgentGroups: { some: { members: { some: { id: 'master-1' } } } } },
                ],
              },
            ],
          },
        })
      );
    });

    it('does NOT restrict ADMIN at all (global access, no filter)', async () => {
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

    it('filters by any of several comma-separated tags (OR semantics) for ADMIN (single AND-clause collapses to a flat where)', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN }, { tags: 'senha, ajuda' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tags: { hasSome: ['senha', 'ajuda'] } },
        })
      );
    });

    it('filters by folderId when provided, for ADMIN', async () => {
      await service.findAll({ id: '2', role: Role.ADMIN }, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { folderId: 'folder-1' },
        })
      );
    });

    it('combines the visibility rule with a folderId filter for a CLIENT (folder filter must not bypass visibility)', async () => {
      await service.findAll({ id: 'client-1', role: Role.CLIENT }, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { visibility: 'PUBLIC' },
                  {
                    visibility: 'PRIVATE',
                    OR: [
                      { authorId: 'client-1' },
                      { allowedAgentGroups: { some: { members: { some: { id: 'client-1' } } } } },
                    ],
                  },
                ],
              },
              { folderId: 'folder-1' },
            ],
          },
        })
      );
    });

    it('combines the visibility rule with a folderId filter for an anonymous caller', async () => {
      await service.findAll(undefined, { folderId: 'folder-1' });
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{ OR: [{ visibility: 'PUBLIC' }] }, { folderId: 'folder-1' }],
          },
        })
      );
    });
  });

  describe('findOne', () => {
    it('returns the article when it is visible to the caller (DB-level visibility filter matched)', async () => {
      const article = { id: 'article-1', visibility: ArticleVisibility.PUBLIC };
      mockPrisma.article.findFirst.mockResolvedValue(article);

      const result = await service.findOne('article-1', undefined);

      expect(mockPrisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'article-1', OR: [{ visibility: 'PUBLIC' }] },
        })
      );
      expect(result).toEqual(article);
    });

    it('returns the article for ADMIN with no visibility filter at all', async () => {
      const article = { id: 'article-1', visibility: ArticleVisibility.PRIVATE };
      mockPrisma.article.findFirst.mockResolvedValue(article);

      await service.findOne('article-1', { id: 'admin-1', role: Role.ADMIN });

      expect(mockPrisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article-1' } })
      );
    });

    it('throws NotFoundException (never ForbiddenException) when the article exists but is not visible, so ID-spoofing cannot distinguish the two cases', async () => {
      mockPrisma.article.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('private-article-of-someone-else', { id: 'agent-1', role: Role.AGENT }),
      ).rejects.toThrow('Article with ID private-article-of-someone-else not found');
    });

    it('throws NotFoundException when the article truly does not exist', async () => {
      mockPrisma.article.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id', { id: '2', role: Role.ADMIN })).rejects.toThrow(
        'Article with ID missing-id not found',
      );
    });
  });

  describe('visibility ACL scenarios (end-to-end through the mocked Prisma OR clause)', () => {
    // These exercise the exact shape of the generated `where`, which is the
    // only thing unit-testable without a real Postgres — the ACTUAL
    // membership/organization matching happens inside Postgres when this
    // `where` is executed for real (verified in CI's e2e job, not here).

    it('an AGENT who is NOT a member of any allowedAgentGroup still gets a where that only grants access via authorship/org/explicit group membership (no implicit ACCESS)', async () => {
      await service.findAll({ id: 'agent-not-in-group', role: Role.AGENT });
      const call = mockPrisma.article.findMany.mock.calls[0][0];
      const privateClause = call.where.OR[1];
      expect(privateClause.OR).toEqual([
        { authorId: 'agent-not-in-group' },
        { allowedAgentGroups: { some: { members: { some: { id: 'agent-not-in-group' } } } } },
      ]);
    });

    it('the author condition is present so the article author always sees their own PRIVATE article, even if not in any allowed group', async () => {
      await service.findAll({ id: 'author-1', role: Role.AGENT });
      const call = mockPrisma.article.findMany.mock.calls[0][0];
      expect(call.where.OR[1].OR).toContainEqual({ authorId: 'author-1' });
    });

    it('a CLIENT of the right organization gets the allowedOrganizations condition scoped to their own organizationId', async () => {
      await service.findAll({ id: 'client-1', role: Role.CLIENT, organizationId: 'org-right' });
      const call = mockPrisma.article.findMany.mock.calls[0][0];
      expect(call.where.OR[1].OR).toContainEqual({
        allowedOrganizations: { some: { id: 'org-right' } },
      });
    });

    it('a CLIENT from a different organization never gets another organization\'s id injected into the filter', async () => {
      await service.findAll({ id: 'client-2', role: Role.CLIENT, organizationId: 'org-other' });
      const call = mockPrisma.article.findMany.mock.calls[0][0];
      expect(call.where.OR[1].OR).not.toContainEqual({
        allowedOrganizations: { some: { id: 'org-right' } },
      });
    });
  });

  describe('create', () => {
    it('creates with visibility, autoShareWithNewOrganizations and tags, authored by currentUser', async () => {
      mockPrisma.article = { ...mockPrisma.article, create: jest.fn().mockResolvedValue({ id: 'a1' }) };
      const dto = {
        title: 'Como trocar senha',
        content: 'Siga os passos...',
        visibility: ArticleVisibility.PRIVATE,
        autoShareWithNewOrganizations: true,
        tags: ['senha'],
      };

      await service.create(dto as any, { id: 'agent-1', role: Role.AGENT });

      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: {
          title: 'Como trocar senha',
          content: 'Siga os passos...',
          visibility: ArticleVisibility.PRIVATE,
          autoShareWithNewOrganizations: true,
          tags: ['senha'],
          authorId: 'agent-1',
        },
      });
    });

    it('connects agentGroupIds/organizationIds/serviceCatalogItemIds when provided', async () => {
      mockPrisma.article = { ...mockPrisma.article, create: jest.fn().mockResolvedValue({ id: 'a1' }) };
      const dto = {
        title: 'T',
        content: 'C',
        agentGroupIds: ['g1', 'g2'],
        organizationIds: ['o1'],
        serviceCatalogItemIds: ['c1'],
      };

      await service.create(dto as any, { id: 'agent-1', role: Role.AGENT });

      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allowedAgentGroups: { connect: [{ id: 'g1' }, { id: 'g2' }] },
          allowedOrganizations: { connect: [{ id: 'o1' }] },
          serviceCatalogItems: { connect: [{ id: 'c1' }] },
        }),
      });
    });
  });

  describe('update', () => {
    it('replaces (set) the whole allowedAgentGroups/allowedOrganizations/serviceCatalogItems lists when provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'a1', authorId: 'agent-1' });
      mockPrisma.article.update = jest.fn().mockResolvedValue({ id: 'a1' });

      await service.update(
        'a1',
        { agentGroupIds: ['g1'], organizationIds: [], serviceCatalogItemIds: ['c1', 'c2'] } as any,
        { id: 'agent-1', role: Role.AGENT },
      );

      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: {
          allowedAgentGroups: { set: [{ id: 'g1' }] },
          allowedOrganizations: { set: [] },
          serviceCatalogItems: { set: [{ id: 'c1' }, { id: 'c2' }] },
        },
      });
    });

    it('does not touch a relation at all when its field is absent from the dto', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'a1', authorId: 'agent-1' });
      mockPrisma.article.update = jest.fn().mockResolvedValue({ id: 'a1' });

      await service.update('a1', { title: 'Novo título' } as any, { id: 'agent-1', role: Role.AGENT });

      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { title: 'Novo título' },
      });
    });
  });

  describe('remove limitations', () => {
    it('should throw Forbidden if AGENT tries to remove article they do not own', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'xxx', authorId: 'another-user' });
      await expect(service.remove('xxx', { id: 'agent-1', role: Role.AGENT })).rejects.toThrow(ForbiddenException);
    });
  });
});
