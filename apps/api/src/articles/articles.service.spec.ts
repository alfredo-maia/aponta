import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const mockPrismaService = {
  article: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

const client: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };
const agent: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };

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

    it('queries all articles (public and internal) for an AGENT', async () => {
      mockPrismaService.article.findMany.mockResolvedValue([]);

      await service.findAll(agent);

      expect(mockPrismaService.article.findMany).toHaveBeenCalledWith({
        where: {},
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
});
