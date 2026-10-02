const fs = require('fs');

let c = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', 'utf8');
// remove the extra }
c = c.replace(/}\n\s*@Patch\(':id\/parent'\)/, "@Patch(':id/parent')");
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', c);

let s = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');
s = s.replace(/ForbiddenException,/g, '');
s = s.replace(/NotFoundException,/, 'NotFoundException, ForbiddenException,');
s = s.replace('const ticket = await this.findOne(id, currentUser); // checks permissions', 'await this.findOne(id, currentUser); // checks permissions'); // don't assign 'ticket' if unused
s = s.replace('currentParentId = ancestor?.parentTicketId;', 'currentParentId = ancestor?.parentTicketId || null;');
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', s);
