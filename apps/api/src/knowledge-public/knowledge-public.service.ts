import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicArticleQueryDto } from './dto/public-article-query.dto';

type PublicArticleRow = Prisma.ArticleGetPayload<{
  include: typeof ARTICLE_INCLUDE;
}>;

const ARTICLE_INCLUDE = {
  folder: { select: { id: true, name: true, icon: true } },
  attachments: { select: { id: true, originalName: true, mimeType: true } },
} as const;

/**
 * Output allowlist (D-04, adjusted by D-09): only what the no-login portal
 * needs to render. Deliberately excludes author/authorId, ACL fields
 * (allowedAgentGroups/allowedOrganizations), serviceCatalogItems,
 * autoShareWithNewOrganizations and createdAt — see AC-04. Attachments
 * never carry `fileUrl`/`filename` here (D-09 changed their meaning to an
 * internal, non-navigable value); the portal downloads them through
 * `GET articles/:articleId/attachments/:id/download`, built client-side
 * from `id` alone.
 */
function toPublicArticle(article: PublicArticleRow) {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    folder: article.folder
      ? { id: article.folder.id, name: article.folder.name, icon: article.folder.icon }
      : null,
    tags: article.tags,
    updatedAt: article.updatedAt,
    attachments: article.attachments.map((attachment) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    })),
  };
}

/**
 * No-login public knowledge portal (D-01/D-02, Stage 4/S4.1). Every method
 * here fixes `visibility: PUBLIC` directly in the Prisma `where` clause —
 * never as a parameter the caller could override (AC-01, AC-03) — so a
 * PRIVATE article is structurally unreachable, not just hidden by output
 * filtering. `findOneArticle` throws the identical NotFoundException for
 * "exists but PRIVATE" and "doesn't exist" (AC-02), matching the
 * anti-enumeration convention already used by ArticlesService.findOne.
 */
@Injectable()
export class PublicKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllFolders() {
    const folders = await this.prisma.knowledgeFolder.findMany({
      where: { articles: { some: { visibility: ArticleVisibility.PUBLIC } } },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: { where: { visibility: ArticleVisibility.PUBLIC } } },
        },
      },
    });

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      icon: folder.icon,
      articleCount: folder._count.articles,
    }));
  }

  async findAllArticles(query?: PublicArticleQueryDto) {
    const where: Prisma.ArticleWhereInput = { visibility: ArticleVisibility.PUBLIC };
    if (query?.folderId) {
      where.folderId = query.folderId;
    }

    const articles = await this.prisma.article.findMany({
      where,
      orderBy: [{ folder: { name: 'asc' } }, { title: 'asc' }],
      include: ARTICLE_INCLUDE,
    });

    // Defense in depth for AC-01/AC-04: re-check visibility in application
    // code too, so a PRIVATE row can never reach a caller even if the
    // `where` clause above were ever weakened by a future edit.
    return articles
      .filter((article) => article.visibility === ArticleVisibility.PUBLIC)
      .map((article) => toPublicArticle(article as PublicArticleRow));
  }

  async findOneArticle(id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, visibility: ArticleVisibility.PUBLIC },
      include: ARTICLE_INCLUDE,
    });

    // Same defense in depth as findAllArticles — and the identical
    // NotFoundException either way (AC-02 anti-enumeration).
    if (!article || article.visibility !== ArticleVisibility.PUBLIC) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return toPublicArticle(article as PublicArticleRow);
  }
}
