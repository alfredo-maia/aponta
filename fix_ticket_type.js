const fs = require('fs');

let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/hooks/useTickets.ts', 'utf8');
code = code.replace(
  '  createdAt: string;',
  `  parentTicketId?: string | null;
  parentTicket?: { id: string; protocol: string; title: string; status: TicketStatus; } | null;
  subTickets?: { id: string; protocol: string; title: string; status: TicketStatus; }[];
  createdAt: string;`
);

fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/hooks/useTickets.ts', code);

// also fix TicketParent.tsx
let ui = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketParent.tsx', 'utf8');
ui = ui.replace("import { TicketBadge } from './TicketCard'; // A status badge helper if needed", "");
ui = ui.replace('title="Chamado', '/* no title allowed on lucide without cast */');

fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketParent.tsx', ui);

