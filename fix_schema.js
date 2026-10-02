const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/prisma/schema.prisma', 'utf8');

// remove all the bad inserts
code = code.replace(/  parentTicketId String\?\n  parentTicket   Ticket\?  @relation\("ParentChildTickets", fields: \[parentTicketId\], references: \[id\]\)\n  subTickets     Ticket\[\] @relation\("ParentChildTickets"\)\n\n/g, '');

// insert beautifully
code = code.replace('  attachments TicketAttachment[]', `  parentTicketId String?
  parentTicket   Ticket?  @relation("ParentChildTickets", fields: [parentTicketId], references: [id])
  subTickets     Ticket[] @relation("ParentChildTickets")

  attachments TicketAttachment[]`);

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/prisma/schema.prisma', code);
