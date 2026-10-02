const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');

code = code.replace(
  'requester: { select: { organizationId: true } },',
  `requester: { select: { organizationId: true } },
        parentTicket: { select: { id: true, protocol: true, title: true, status: true } },
        subTickets: { select: { id: true, protocol: true, title: true, status: true } },`
);

const newMethod = `
  async updateParent(
    id: string,
    parentProtocol: string | null | undefined,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.findOne(id, currentUser); // checks permissions
    
    if (!parentProtocol) {
      // Disconnect
      return this.prisma.ticket.update({
        where: { id },
        data: { parentTicketId: null },
      });
    }

    const parent = await this.prisma.ticket.findUnique({
      where: { protocol: parentProtocol.toUpperCase() },
    });

    if (!parent) {
      throw new NotFoundException(\`Parent ticket '\${parentProtocol}' not found\`);
    }

    if (parent.id === id) {
      throw new ForbiddenException('A ticket cannot be its own parent');
    }

    // Cyclic check: Is the parent actually a child (or sub-child) of this ticket?
    // A simple 1-level check is usually enough for basic helpdesk, but let's check recursively if needed
    // Assuming max depth is low, we can fetch parents upwards.
    let currentParentId = parent.parentTicketId;
    while (currentParentId) {
      if (currentParentId === id) {
         throw new ForbiddenException('Cyclic relationship detected. This parent is already your child/descendant.');
      }
      const ancestor = await this.prisma.ticket.findUnique({ where: { id: currentParentId }, select: { parentTicketId: true }});
      currentParentId = ancestor?.parentTicketId;
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { parentTicketId: parent.id },
    });
  }
}
`;

code = code.replace(/}\s*$/, newMethod);
if (!code.includes('ForbiddenException')) {
  code = code.replace('NotFoundException,', 'NotFoundException, ForbiddenException,');
}

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', code);
