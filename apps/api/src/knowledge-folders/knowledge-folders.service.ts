import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeFolderDto } from './dto/create-knowledge-folder.dto';
import { UpdateKnowledgeFolderDto } from './dto/update-knowledge-folder.dto';

/**
 * Knowledge panel folders (DMTE-87, Stage 1). Folders are a simple, flat
 * grouping of Articles — no ACL/sharing concept yet (that's Stage 2+).
 * Removing a folder never deletes its articles: the FK uses
 * ON DELETE SET NULL (see migration 20261019210000_add_knowledge_folder),
 * so articles just fall back to being ungrouped.
 */
@Injectable()
export class KnowledgeFoldersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.knowledgeFolder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    });
  }

  create(dto: CreateKnowledgeFolderDto) {
    return this.prisma.knowledgeFolder.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
      },
    });
  }

  async update(id: string, dto: UpdateKnowledgeFolderDto) {
    const folder = await this.prisma.knowledgeFolder.findUnique({ where: { id } });

    if (!folder) {
      throw new NotFoundException(`Knowledge folder with ID ${id} not found`);
    }

    return this.prisma.knowledgeFolder.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const folder = await this.prisma.knowledgeFolder.findUnique({ where: { id } });

    if (!folder) {
      throw new NotFoundException(`Knowledge folder with ID ${id} not found`);
    }

    return this.prisma.knowledgeFolder.delete({ where: { id } });
  }
}
