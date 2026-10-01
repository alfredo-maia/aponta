import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { Role } from '@prisma/client';

/**
 * Knowledge Base (FAQ) articles. Articles can be public (visible to
 * everyone, including unauthenticated/CLIENT users) or internal
 * (AGENT+ only). Only AGENT and above may author articles — CLIENT and
 * CLIENT_MASTER are strictly read-only, enforced via RBAC on the
 * controller AND a query-level filter here so an internal article is
 * never even fetched for a CLIENT.
 */
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  findAll(currentUser: CurrentUserPayload) {
    const isClient =
      currentUser.role === Role.CLIENT ||
      currentUser.role === Role.CLIENT_MASTER;

    return this.prisma.article.findMany({
      where: isClient ? { isPublic: true } : {},
      orderBy: { createdAt: 'desc' },
    });
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
}