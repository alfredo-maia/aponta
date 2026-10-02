const fs = require('fs');

const files = [
  '/home/hermes/repos/aponta/apps/api/src/checklists/checklists.service.spec.ts',
  '/home/hermes/repos/aponta/apps/api/src/comments/listeners/mail-inbound.listener.spec.ts',
  '/home/hermes/repos/aponta/apps/api/src/mail/imap.service.ts',
  '/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts',
  '/home/hermes/repos/aponta/apps/web/src/components/ServiceDeskEditor.tsx',
  '/home/hermes/repos/aponta/apps/web/src/pages/CreateTicketPage.tsx',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/: unknown/g, ': any');
  content = content.replace(/as unknown/g, 'as any');
  fs.writeFileSync(file, content);
});

let authSpec = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/auth/auth.service.spec.ts', 'utf8');
authSpec = authSpec.replace(/role: Role.AGENT, phone: null, phone: null,/g, 'role: Role.AGENT, phone: null,');
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/auth/auth.service.spec.ts', authSpec);
