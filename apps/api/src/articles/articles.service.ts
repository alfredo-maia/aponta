import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { ArticleVisibility, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto, ArticleSort } from './dto/article-query.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { sanitizeArticleContent } from './sanitize-article-content';

/**
 * Knowledge Base (FAQ) articles.
 *
 * Visibility (DMTE-88, Stage 2 — supersedes the old boolean `isPublic`):
 * an Article is either PUBLIC (visible to everyone, including
 * unauthenticated/CLIENT users) or PRIVATE (visible only to its author, to
 * members of any of its `allowedAgentGroups`, or to users whose
 * `organizationId` is in its `allowedOrganizations`).
 *
 * ADMIN always sees every article unconditionally (project convention:
 * ADMIN has global access) — this is a deliberate behavior change from the
 * old rule where AGENT/AGENT_MASTER also bypassed the visibility filter
 * entirely; now AGENT/AGENT_MASTER are subject to the same PRIVATE-article
 * ACL as everyone else (only ADMIN is exempt).
 */
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  findAll(currentUser: CurrentUserPayload | undefined, query?: ArticleQueryDto) {
    const andClauses: Prisma.ArticleWhereInput[] = [];

    const visibilityOr = this.buildVisibilityOr(currentUser);
    if (visibilityOr) {
      andClauses.push({ OR: visibilityOr });
    }

    if (query?.search) {
      andClauses.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query?.tags) {
      const tagList = query.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        andClauses.push({ tags: { hasSome: tagList } });
      }
    }

    if (query?.folderId) {
      andClauses.push({ folderId: query.folderId });
    }

    const where: Prisma.ArticleWhereInput =
      andClauses.length === 0
        ? {}
        : andClauses.length === 1
          ? andClauses[0]
          : { AND: andClauses };

    return this.prisma.article.findMany({
      where,
      orderBy: this.resolveOrderBy(query?.sort),
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
    });
  }

  /**
   * Used by KnowledgeAttachmentsController to 404 early when the parent
   * article doesn't exist, mirroring how AttachmentsController leans on
   * TicketsService.findOne before accepting an upload. Deliberately a
   * plain existence check (no visibility filter) — the attachments
   * endpoints already gate who can reach them via PermissionsGuard
   * (MANAGE_KNOWLEDGE_BASE only), so there's no anonymous/CLIENT path
   * that could use this to probe for private article IDs.
   */
  findById(id: string) {
    return this.prisma.article.findUnique({ where: { id } });
  }

  /**
   * Fetches a single article applying the same visibility rule as
   * findAll(). When the article exists but is not visible to currentUser,
   * throws NotFoundException (never ForbiddenException) so an ID-spoofing
   * attempt cannot distinguish "doesn't exist" from "exists but private" —
   * same anti-enumeration convention already used elsewhere for isPublic.
   */
  async findOne(id: string, currentUser: CurrentUserPayload | undefined) {
    const visibilityOr = this.buildVisibilityOr(currentUser);

    const article = await this.prisma.article.findFirst({
      where: {
        id,
        ...(visibilityOr ? { OR: visibilityOr } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        folder: true,
        allowedAgentGroups: { select: { id: true, name: true, organizationId: true } },
        allowedOrganizations: { select: { id: true, name: true } },
        serviceCatalogItems: true,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return article;
  }

  /**
   * Builds the OR clause that decides whether a PRIVATE article is visible
   * to currentUser, shared by findAll() and findOne() so both apply the
   * exact same rule. Returns undefined for ADMIN, meaning "no filter at
   * all" (global access).
   */
  private buildVisibilityOr(
    currentUser: CurrentUserPayload | undefined,
  ): Prisma.ArticleWhereInput[] | undefined {
    if (currentUser?.role === Role.ADMIN) {
      return undefined;
    }

    const or: Prisma.ArticleWhereInput[] = [{ visibility: ArticleVisibility.PUBLIC }];

    if (currentUser) {
      const privateOr: Prisma.ArticleWhereInput[] = [
        { authorId: currentUser.id },
        { allowedAgentGroups: { some: { members: { some: { id: currentUser.id } } } } },
      ];

      if (currentUser.organizationId) {
        privateOr.push({ allowedOrganizations: { some: { id: currentUser.organizationId } } });
      }

      or.push({ visibility: ArticleVisibility.PRIVATE, OR: privateOr });
    }

    return or;
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
    const { agentGroupIds, organizationIds, serviceCatalogItemIds, ...rest } = dto;

    return this.prisma.article.create({
      data: {
        title: rest.title,
        content: sanitizeArticleContent(rest.content),
        visibility: rest.visibility,
        autoShareWithNewOrganizations: rest.autoShareWithNewOrganizations,
        tags: rest.tags,
        authorId: currentUser.id,
        ...(agentGroupIds && {
          allowedAgentGroups: { connect: agentGroupIds.map((gid) => ({ id: gid })) },
        }),
        ...(organizationIds && {
          allowedOrganizations: { connect: organizationIds.map((oid) => ({ id: oid })) },
        }),
        ...(serviceCatalogItemIds && {
          serviceCatalogItems: { connect: serviceCatalogItemIds.map((cid) => ({ id: cid })) },
        }),
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

    const { agentGroupIds, organizationIds, serviceCatalogItemIds, ...rest } = dto;

    return this.prisma.article.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.content !== undefined && {
          content: sanitizeArticleContent(rest.content),
        }),
        // Relations are only touched when the field is explicitly present
        // on the DTO; `set` replaces the whole list, matching a multi-select
        // edit UI (never appends).
        ...(agentGroupIds !== undefined && {
          allowedAgentGroups: { set: agentGroupIds.map((gid) => ({ id: gid })) },
        }),
        ...(organizationIds !== undefined && {
          allowedOrganizations: { set: organizationIds.map((oid) => ({ id: oid })) },
        }),
        ...(serviceCatalogItemIds !== undefined && {
          serviceCatalogItems: { set: serviceCatalogItemIds.map((cid) => ({ id: cid })) },
        }),
      },
    });
  }

  async remove(id: string, currentUser: CurrentUserPayload) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { attachments: { select: { filename: true } } },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    this.assertCanModify(article.authorId, currentUser);

    const deleted = await this.prisma.article.delete({ where: { id } });

    // The DB rows cascade-delete with the article (onDelete: Cascade on
    // KnowledgeAttachment.articleId), but Postgres has no idea the
    // `filename` it stored also names a file on disk — without this, every
    // deleted article leaves its uploaded files behind in ./uploads
    // forever. Best-effort: a file already missing shouldn't block the
    // article deletion that already succeeded.
    await Promise.all(
      article.attachments.map((attachment) =>
        unlink(join(process.cwd(), 'uploads', attachment.filename)).catch(
          () => undefined,
        ),
      ),
    );

    return deleted;
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
