import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto, ArticleSort } from './dto/article-query.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

/**
 * Knowledge Base (FAQ) articles. Articles can be public (visible to
 * everyone, including unauthenticated/CLIENT users) or internal
 * (AGENT+ only). Only AGENT and above may author articles — CLIENT and
 * CLIENT_MASTER (and anonymous/unauthenticated callers) are strictly
 * read-only, enforced via RBAC on the controller AND a query-level
 * filter here so an internal article is never even fetched for them.
 */
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  findAll(currentUser: CurrentUserPayload | undefined, query?: ArticleQueryDto) {
    const isClient =
      !currentUser ||
      currentUser.role === Role.CLIENT ||
      currentUser.role === Role.CLIENT_MASTER;

    const where: Prisma.ArticleWhereInput = {};

    if (isClient) {
      where.isPublic = true;
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.tags) {
      const tagList = query.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        where.tags = { hasSome: tagList };
      }
    }

    if (query?.folderId) {
      where.folderId = query.folderId;
    }

    return this.prisma.article.findMany({
      where,
      orderBy: this.resolveOrderBy(query?.sort),
      include: { author: { select: { id: true, name: true } } },
    });
  }

  /**
   * Mirrors the TiFlux knowledge panel's sort options (A-Z / Z-A / last
   * updated); defaults to last updated, matching its default.
   */
  private resolveOrderBy(sort?: ArticleSort): Prisma.ArticleOrderByWithRelationInput {
    switch (sort) {
      case 'title_asc':
        return { title: 'asc' };
      case 'title_desc':
        return { title: 'desc' };
      default:
        return { updatedAt: 'desc' };
    }
  }

  create(dto: CreateArticleDto, currentUser: CurrentUserPayload) {
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        isPublic: dto.isPublic,
        tags: dto.tags,
        authorId: currentUser.id,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    currentUser: CurrentUserPayload,
  ) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    this.assertCanModify(article.authorId, currentUser);

    return this.prisma.article.update({ where: { id }, data: dto });
  }

  async remove(id: string, currentUser: CurrentUserPayload) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    this.assertCanModify(article.authorId, currentUser);

    return this.prisma.article.delete({ where: { id } });
  }

  /**
   * Only the article's own author or an ADMIN may edit/delete it — a
   * different AGENT (not the author) cannot touch someone else's article.
   */
  private assertCanModify(authorId: string, currentUser: CurrentUserPayload) {
    const isAuthor = authorId === currentUser.id;
    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Só o autor do artigo ou um ADMIN podem editá-lo/excluí-lo',
      );
    }
  }
}
