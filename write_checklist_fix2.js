const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketChecklist.tsx', 'utf8');
code = code.replace(/\.\.\.\[([^\]]+)\]\.join\('\/'\)/g, "[$1].join('/')");
fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketChecklist.tsx', code);
