const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/prisma/schema.prisma', 'utf8');

// remove all bad inserts
code = code.replace(/  parentTicketId String\?\n  parentTicket   Ticket\?  @relation\("ParentChildTickets", fields: \[parentTicketId\], references: \[id\]\)\n  subTickets     Ticket\[\] @relation\("ParentChildTickets"\)\n\n/g, '');

// just target `checklists  TicketChecklist[]` inside Ticket!
code = code.replace('  checklists  TicketChecklist[]', `  parentTicketId String?
  parentTicket   Ticket?  @relation("ParentChildTickets", fields: [parentTicketId], references: [id])
  subTickets     Ticket[] @relation("ParentChildTickets")

  checklists  TicketChecklist[]`);

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/prisma/schema.prisma', code);
