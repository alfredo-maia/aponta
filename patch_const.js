const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');

code = code.replace("let updateData = { status: newStatus };", "const updateData: Prisma.TicketUpdateInput = { status: newStatus };");

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', code);
