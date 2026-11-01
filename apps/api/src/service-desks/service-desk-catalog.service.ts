import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * DMTE-106: catálogo de Categorias e Tipos de atendimento são o mesmo
 * formato (nome/ativo/ordem) por mesa — um único serviço parametrizado por
 * `kind` evita duplicar a lógica de CRUD entre os dois recursos.
 */
export type ServiceDeskCatalogKind = 'category' | 'serviceType';

interface CatalogDelegate {
  findMany: (args: unknown) => Promise<CatalogItem[]>;
  findFirst: (args: unknown) => Promise<CatalogItem | null>;
  create: (args: unknown) => Promise<CatalogItem>;
  update: (args: unknown) => Promise<CatalogItem>;
  delete: (args: unknown) => Promise<CatalogItem>;
}

export interface CatalogItem {
  id: string;
  serviceDeskId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

const TICKET_FIELD_BY_KIND: Record<ServiceDeskCatalogKind, 'categoryId' | 'serviceTypeId'> = {
  category: 'categoryId',
  serviceType: 'serviceTypeId',
};

@Injectable()
export class ServiceDeskCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(kind: ServiceDeskCatalogKind, serviceDeskId: string, activeOnly: boolean) {
    await this.requireDesk(serviceDeskId);
    return this.delegate(kind).findMany({
      where: { serviceDeskId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(kind: ServiceDeskCatalogKind, serviceDeskId: string, name: string) {
    await this.requireDesk(serviceDeskId);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Nome é obrigatório');
    }
    await this.assertNameAvailable(kind, serviceDeskId, trimmed);

    try {
      return await this.delegate(kind).create({
        data: { serviceDeskId, name: trimmed },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Já existe um item com esse nome nesta mesa');
      }
      throw error;
    }
  }

  async update(
    kind: ServiceDeskCatalogKind,
    serviceDeskId: string,
    itemId: string,
    patch: { name?: string; active?: boolean; sortOrder?: number },
  ) {
    await this.requireItem(kind, serviceDeskId, itemId);
    const data: { name?: string; active?: boolean; sortOrder?: number } = {};

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Nome é obrigatório');
      }
      await this.assertNameAvailable(kind, serviceDeskId, trimmed, itemId);
      data.name = trimmed;
    }
    if (patch.active !== undefined) {
      data.active = patch.active;
    }
    if (patch.sortOrder !== undefined) {
      data.sortOrder = patch.sortOrder;
    }

    return this.delegate(kind).update({ where: { id: itemId }, data });
  }

  async remove(kind: ServiceDeskCatalogKind, serviceDeskId: string, itemId: string) {
    await this.requireItem(kind, serviceDeskId, itemId);
    const ticketField = TICKET_FIELD_BY_KIND[kind];
    const inUse = await this.prisma.ticket.count({
      where: { [ticketField]: itemId },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `Em uso por ${inUse} ticket(s); inative em vez de excluir`,
      );
    }
    await this.delegate(kind).delete({ where: { id: itemId } });
    return { id: itemId };
  }

  private delegate(kind: ServiceDeskCatalogKind): CatalogDelegate {
    return kind === 'category'
      ? (this.prisma.serviceDeskCategory as unknown as CatalogDelegate)
      : (this.prisma.serviceDeskServiceType as unknown as CatalogDelegate);
  }

  private async requireDesk(serviceDeskId: string) {
    const desk = await this.prisma.serviceDesk.findUnique({
      where: { id: serviceDeskId },
      select: { id: true },
    });
    if (!desk) {
      throw new NotFoundException(`ServiceDesk with ID ${serviceDeskId} not found`);
    }
  }

  private async requireItem(
    kind: ServiceDeskCatalogKind,
    serviceDeskId: string,
    itemId: string,
  ): Promise<CatalogItem> {
    const item = await this.delegate(kind).findFirst({
      where: { id: itemId, serviceDeskId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado nesta mesa');
    }
    return item;
  }

  private async assertNameAvailable(
    kind: ServiceDeskCatalogKind,
    serviceDeskId: string,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.delegate(kind).findMany({
      where: {
        serviceDeskId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    const normalized = name.toLowerCase();
    if (existing.some((item) => item.name.toLowerCase() === normalized)) {
      throw new ConflictException('Já existe um item com esse nome nesta mesa');
    }
  }
}
