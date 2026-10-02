const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const desks = await prisma.serviceDesk.findMany();
  const d1 = desks[0];
  if (!d1) return console.log('No desktop');
  
  const c1 = await prisma.serviceCatalogCategory.create({ data: { name: 'Infraestrutura', description: 'Hardwares, Impressoras' }});
  await prisma.serviceCatalogItem.create({ data: { title: 'Toner / Impressora (Exemplo)', description: 'Troca de toner ou travamento', categoryId: c1.id, defaultServiceDeskId: d1.id, defaultPriority: 'MEDIUM', icon: 'Printer' }});
  
  const c2 = await prisma.serviceCatalogCategory.create({ data: { name: 'Sistemas', description: 'Acessos e bugs' }});
  await prisma.serviceCatalogItem.create({ data: { title: 'Problema no ERP', description: 'Travamento ou lentidão', categoryId: c2.id, defaultServiceDeskId: d1.id, defaultPriority: 'HIGH', icon: 'Bug' }});
  
  console.log('Seeded');
}
main().catch(console.error).finally(()=>prisma.$disconnect());
