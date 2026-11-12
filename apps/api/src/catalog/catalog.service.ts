import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { DESK_CATALOG_SELECT, deskServesOrganization, isClientRole, isDeskUsableBy } from '../service-desks/desk-policy';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCategories(includeItems = false, onlyActive = false) {
    return this.prisma.serviceCatalogCategory.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: includeItems ? { 
        items: onlyActive ? { where: { isActive: true }, orderBy: { title: 'asc' } } : { orderBy: { title: 'asc' } } 
      } : undefined,
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Catálogo da abertura de chamados para o usuário: só itens ativos cuja mesa ele pode usar.
   * Atendente pode restringir ao Cliente; CLIENT fica sempre na própria organização.
   */
  async findActiveCatalog(user: CurrentUserPayload, organizationId?: string) {
    const categories = await this.prisma.serviceCatalogCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { title: 'asc' },
          include: {
            defaultServiceDesk: { select: DESK_CATALOG_SELECT },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    const isClient = isClientRole(user);
    return categories
      .map((category) => ({
        ...category,
        // flatMap tira a mesa da resposta: ela carrega ids de atendentes e grupos.
        items: category.items.flatMap(({ defaultServiceDesk: desk, ...item }) =>
          isDeskUsableBy(desk, user) &&
          (isClient || !organizationId || deskServesOrganization(desk, organizationId))
            ? [item]
            : [],
        ),
      }))
      .filter((category) => category.items.length > 0);
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.serviceCatalogCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const exists = await this.prisma.serviceCatalogCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    return this.prisma.serviceCatalogCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    const exists = await this.prisma.serviceCatalogCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    await this.prisma.serviceCatalogCategory.delete({ where: { id } });
  }

  async createItem(dto: CreateCatalogItemDto) {
    const cat = await this.prisma.serviceCatalogCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
    
    const sd = await this.prisma.serviceDesk.findUnique({ where: { id: dto.defaultServiceDeskId } });
    if (!sd) throw new NotFoundException('Service Desk not found');

    return this.prisma.serviceCatalogItem.create({ data: dto });
  }

  async updateItem(id: string, dto: UpdateCatalogItemDto) {
    const exists = await this.prisma.serviceCatalogItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Catalog item not found');

    if (dto.categoryId) {
      const cat = await this.prisma.serviceCatalogCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Category not found');
    }
    if (dto.defaultServiceDeskId) {
      const sd = await this.prisma.serviceDesk.findUnique({ where: { id: dto.defaultServiceDeskId } });
      if (!sd) throw new NotFoundException('Service Desk not found');
    }

    return this.prisma.serviceCatalogItem.update({ where: { id }, data: dto });
  }

  async deleteItem(id: string) {
    const exists = await this.prisma.serviceCatalogItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Catalog item not found');
    await this.prisma.serviceCatalogItem.delete({ where: { id } });
  }
}
