const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketCard.tsx', 'utf8');

code = code.replace(
  /export const statusLabels: Record<TicketStatus, string> = {[\s\S]*?};/,
  `export const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  PENDING_CUSTOMER: 'Aguardando Cliente',
  ON_HOLD: 'Aguardando Terceiros',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  ESCALATED: 'Escalonado',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};`
);

code = code.replace(
  /export const statusBadgeClasses: Record<TicketStatus, string> = {[\s\S]*?};/,
  `export const statusBadgeClasses: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  PENDING_CUSTOMER: 'bg-orange-100 text-orange-800 border-orange-200',
  ON_HOLD: 'bg-purple-100 text-purple-800 border-purple-200',
  PENDING_APPROVAL: 'bg-pink-100 text-pink-800 border-pink-200',
  ESCALATED: 'bg-red-200 text-red-900 border-red-300 font-bold',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-gray-200 text-gray-700',
};`
);

fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketCard.tsx', code);
