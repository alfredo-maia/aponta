const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');

code = code.replace(
  /responseDeadline: Date \| null;\n      resolveDeadline: Date \| null;/,
  `responseDeadline: Date | null;
      resolveDeadline: Date | null;
      slaAccumulatedPauseTime: number;
      slaPausedAt: Date | null;`
);

const oldGet = `      responseSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.responseDeadline,
        now,
      ),
      resolveSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.resolveDeadline,
        now,
      ),`;

const newGet = `      responseSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.responseDeadline,
        now,
        ticket.slaAccumulatedPauseTime,
        ticket.slaPausedAt
      ),
      resolveSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.resolveDeadline,
        now,
        ticket.slaAccumulatedPauseTime,
        ticket.slaPausedAt
      ),`;

code = code.replace(oldGet, newGet);
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', code);
