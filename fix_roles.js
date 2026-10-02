const fs = require('fs');
const files = [
  '/home/hermes/repos/aponta/apps/web/src/pages/KnowledgePage.tsx',
  '/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketDetail.tsx',
  '/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketParent.tsx',
  '/home/hermes/repos/aponta/apps/web/src/components/tickets/CommentForm.tsx',
  '/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketAttachments.tsx'
];

for (const f of files) {
   let code = fs.readFileSync(f, 'utf8');
   code = code.replace(/user\?\.role === 'AGENT' \|\| user\?\.role === 'ADMIN'/g, "['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string)");
   code = code.replace(/role === 'AGENT' \|\| role === 'ADMIN'/g, "['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(role as string)");
   fs.writeFileSync(f, code);
}
console.log('Fixed');
