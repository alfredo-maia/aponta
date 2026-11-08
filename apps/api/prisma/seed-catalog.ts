/**
 * DMTE-456: popula o catálogo de serviços (ServiceCatalogCategory/Item) a partir
 * de `seeds/catalogo-atendimento.json`. Idempotente: upsert por nome da categoria
 * e por título do item dentro da categoria. Não mexe em categorias fora do JSON.
 *
 * Uso (precisa de DATABASE_URL; a mesa precisa existir):
 *   pnpm exec nx run api:catalog-seed
 *   CATALOG_SERVICE_DESK="Outra Mesa" pnpm exec nx run api:catalog-seed
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CatalogSeedItem {
  macro_category: string;
  item_title: string;
  item_description: string;
  default_priority: string;
  icon: string;
}

export interface CatalogSeedData {
  items: CatalogSeedItem[];
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// `prisma` é tipado de forma frouxa de propósito: aceita PrismaClient e o fake do spec.
export async function seedServiceCatalog(
  prisma: any,
  data: CatalogSeedData,
  serviceDeskName: string,
): Promise<void> {
  // Valida tudo antes da primeira escrita: falha não deixa catálogo pela metade.
  const desk = await prisma.serviceDesk.findFirst({ where: { name: serviceDeskName } });
  if (!desk) throw new Error(`Mesa de serviço "${serviceDeskName}" não encontrada; nada foi gravado.`);
  for (const item of data.items) {
    if (!PRIORITIES.includes(item.default_priority)) {
      throw new Error(`Prioridade inválida "${item.default_priority}" em "${item.item_title}"; nada foi gravado.`);
    }
  }

  const categoryIds = new Map<string, string>();
  for (const item of data.items) {
    let categoryId = categoryIds.get(item.macro_category);
    if (!categoryId) {
      const existing = await prisma.serviceCatalogCategory.findFirst({ where: { name: item.macro_category } });
      const category = existing ?? (await prisma.serviceCatalogCategory.create({ data: { name: item.macro_category } }));
      categoryId = category.id as string;
      categoryIds.set(item.macro_category, categoryId);
    }
    const fields = {
      description: item.item_description,
      icon: item.icon,
      defaultPriority: item.default_priority,
      defaultServiceDeskId: desk.id,
    };
    const existing = await prisma.serviceCatalogItem.findFirst({ where: { categoryId, title: item.item_title } });
    if (existing) {
      await prisma.serviceCatalogItem.update({ where: { id: existing.id }, data: fields });
    } else {
      await prisma.serviceCatalogItem.create({ data: { categoryId, title: item.item_title, ...fields } });
    }
  }
  console.log(`Catálogo semeado: ${categoryIds.size} categorias, ${data.items.length} itens (mesa ${desk.name}).`);
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });
  try {
    const data = JSON.parse(readFileSync(join(__dirname, 'seeds/catalogo-atendimento.json'), 'utf8'));
    await seedServiceCatalog(prisma, data, process.env['CATALOG_SERVICE_DESK'] ?? 'Suporte Geral');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
