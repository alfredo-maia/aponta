import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const mockPrismaService = {
  article: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
};

const client: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };
const agent: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
const otherAgent: CurrentUserPayload = { id: 'agent-2', role: Role.AGENT };
const admin: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('queries only public articles for a CLIENT', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(client);

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('queries only public articles for an anonymous (unauthenticated) caller', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(undefined);

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('queries all articles (public and internal) for an AGENT', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(agent);

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by search keyword across title and content (case-insensitive)', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(agent, { search: 'senha' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'senha', mode: 'insensitive' } },
            { content: { contains: 'senha', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by tag', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(agent, { tag: 'senha' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: { tags: { has: 'senha' } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('combines the role-based isPublic filter with search for a CLIENT', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(client, { search: 'senha' });

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: {
          isPublic: true,
          OR: [
            { title: { contains: 'senha', mode: 'insensitive' } },
            { content: { contains: 'senha', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('creates an article with the current user as author', async () => {
      mockPrismaService.article.create.mockResolvedValue({
        id: 'article-1',
        title: 'Como resetar a senha',
        content: '...',
        isPublic: true,
        authorId: 'agent-1',
      });

      const result = await service.create(
        { title: 'Como resetar a senha', content: '...', isPublic: true },
        agent,
      );

      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: {
          title: 'Como resetar a senha',
          content: '...',
          isPublic: true,
          tags: undefined,
          authorId: 'agent-1',
        },
      });
      expect(result.authorId).toBe('agent-1');
    });

    it('defaults tags to an empty array handling when omitted', async () => {
      mockPrismaService.article.create.mockResolvedValue({
        id: 'article-2',
        title: 'FAQ interno',
        content: '...',
        isPublic: false,
        authorId: 'agent-1',
      });

      await service.create(
        { title: 'FAQ interno', content: '...', isPublic: false },
        agent,
      );

      expect(mockPrismaService.article.create).toHaveBeenCalledWith({
        data: {
          title: 'FAQ interno',
          content: '...',
          isPublic: false,
          tags: undefined,
          authorId: 'agent-1',
        },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the article does not exist', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'Novo título' }, agent),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });

    it('allows the author to update their own article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });
      mockPrismaService.article.update.mockResolvedValue({
        id: 'article-1',
        title: 'Título atualizado',
      });

      await service.update('article-1', { title: 'Título atualizado' }, agent);

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        data: { title: 'Título atualizado' },
      });
    });

    it('allows ADMIN to update any article regardless of author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });
      mockPrismaService.article.update.mockResolvedValue({
        id: 'article-1',
        title: 'Título atualizado por admin',
      });

      await service.update(
        'article-1',
        { title: 'Título atualizado por admin' },
        admin,
      );

      expect(mockPrismaService.article.update).toHaveBeenCalled();
    });

    it('throws ForbiddenException when a different AGENT (not author, not ADMIN) tries to update', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });

      await expect(
        service.update('article-1', { title: 'Hackeado' }, otherAgent),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the article does not exist', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', agent)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.article.delete).not.toHaveBeenCalled();
    });

    it('allows the author to delete their own article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });
      mockPrismaService.article.delete.mockResolvedValue({ id: 'article-1' });

      await service.remove('article-1', agent);

      expect(mockPrismaService.article.delete).toHaveBeenCalledWith({
        where: { id: 'article-1' },
      });
    });

    it('allows ADMIN to delete any article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });
      mockPrismaService.article.delete.mockResolvedValue({ id: 'article-1' });

      await service.remove('article-1', admin);

      expect(mockPrismaService.article.delete).toHaveBeenCalled();
    });

    it('throws ForbiddenException when a different AGENT tries to delete', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        id: 'article-1',
        authorId: 'agent-1',
      });

      await expect(service.remove('article-1', otherAgent)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.article.delete).not.toHaveBeenCalled();
    });
  });
});
