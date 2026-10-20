import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeCatalogItemDto } from './dto/create-knowledge-catalog-item.dto';
import { UpdateKnowledgeCatalogItemDto } from './dto/update-knowledge-catalog-item.dto';
import { KnowledgeCatalogQueryDto } from './dto/knowledge-catalog-query.dto';

export interface KnowledgeCatalogItemRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Catálogo de Serviços do painel de Conhecimentos (DMTE-88, Stage 2): lista
 * FLAT (sem hierarquia/árvore) de itens que podem ser associados a
 * Articles.
 *
 * NOTE on the model name: this is backed by the `KnowledgeCatalogItem`
 * Prisma model, not `ServiceCatalogItem` — that name was already taken by
 * an unrelated, already-implemented feature (the ticket-opening catalog in
 * `apps/api/src/catalog`, tied to ServiceCatalogCategory + ServiceDesk).
 * See the comment above the `KnowledgeCatalogItem` model in schema.prisma
 * for the full rationale. The REST route stays `/service-catalog-items` as
 * specified, since there is no route-level collision.
 */
@Injectable()
export class KnowledgeCatalogService {
  constructor(private prisma: PrismaService) {}

  /**
   * With a search term, combines an exact/partial ILIKE match with a
   * pg_trgm similarity match (typo-tolerant) so e.g. searching
   * "trienamento" still finds "Treinamento". This can only be exercised for
   * real against a live Postgres (unit tests here only assert the raw SQL
   * is invoked with the right parameter — see knowledge-catalog.service.spec.ts).
   * Without a search term, falls back to a plain Prisma findMany ordered by
   * name.
   */
  findAll(query?: KnowledgeCatalogQueryDto) {
    if (query?.search) {
      return this.prisma.$queryRaw<KnowledgeCatalogItemRow[]>`
        SELECT * FROM "KnowledgeCatalogItem"
        WHERE name ILIKE '%' || ${query.search} || '%'
           OR COALESCE(description, '') ILIKE '%' || ${query.search} || '%'
           OR similarity(name, ${query.search}) > 0.3
           OR similarity(COALESCE(description, ''), ${query.search}) > 0.3
        ORDER BY GREATEST(similarity(name, ${query.search}), similarity(COALESCE(description, ''), ${query.search})) DESC, name ASC
      `;
    }

    return this.prisma.knowledgeCatalogItem.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.knowledgeCatalogItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Service catalog item with ID ${id} not found`);
    }

    return item;
  }

  create(dto: CreateKnowledgeCatalogItemDto) {
    return this.prisma.knowledgeCatalogItem.create({ data: dto });
  }

  async update(id: string, dto: UpdateKnowledgeCatalogItemDto) {
    const item = await this.prisma.knowledgeCatalogItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Service catalog item with ID ${id} not found`);
    }

    return this.prisma.knowledgeCatalogItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const item = await this.prisma.knowledgeCatalogItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Service catalog item with ID ${id} not found`);
    }

    return this.prisma.knowledgeCatalogItem.delete({ where: { id } });
  }
}
