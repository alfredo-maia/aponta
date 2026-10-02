const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');

const target = `  async create(
    dto: CreateTicketDto,
    requesterId: string,
  ): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;`;

const replacement = `  async create(
    dto: CreateTicketDto,
    requesterId: string,
  ): Promise<Ticket> {
    let priority = dto.priority ?? TicketPriority.MEDIUM;
    let serviceDeskId = dto.serviceDeskId;

    if (dto.catalogItemId) {
      const catalogItem = await this.prisma.serviceCatalogItem.findUnique({ where: { id: dto.catalogItemId }});
      if (catalogItem && catalogItem.isActive) {
         priority = catalogItem.defaultPriority;
         serviceDeskId = catalogItem.defaultServiceDeskId;
      }
    }

`;

code = code.replace(target, replacement);
code = code.replace(/dto\.serviceDeskId/g, "serviceDeskId"); // Note: there are several places using dto.serviceDeskId for SLA
code = code.replace(/data: \{\s*protocol,\s*title: dto.title,\s*description: dto.description,\s*priority,\s*serviceDeskId,\s*requesterId,/g, `data: {
              protocol,
              title: dto.title,
              description: dto.description,
              priority,
              serviceDeskId,
              requesterId,`);

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', code);
