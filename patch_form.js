const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketForm.tsx', 'utf8');

code = code.replace(
  '{!catalogOverride && (',
  `{catalogOverride && (
        <>
          <input type="hidden" {...register('serviceDeskId')} />
          <input type="hidden" {...register('priority')} />
        </>
      )}
      {!catalogOverride && (`
);

fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketForm.tsx', code);
