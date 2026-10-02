const fs = require('fs');
const path = '/home/hermes/repos/aponta/apps/api/src/mail/imap.service.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const parsed = await simpleParser(message.source);',
  'const parsed = await simpleParser(message.source as any);'
);

fs.writeFileSync(path, code);
