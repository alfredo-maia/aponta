const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketDetail.tsx', 'utf8');
code = code.replace('</section>\n      )}', '</section>\n        </>\n      )}');
fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketDetail.tsx', code);
