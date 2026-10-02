const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', 'utf8');

code = code.replace('import { ChangeServiceDeskDto } from "./dto/change-service-desk.dto";\nimport { UpdateParentDto } from "./dto/update-parent.dto"; from \'./dto/change-service-desk.dto\';', 'import { ChangeServiceDeskDto } from "./dto/change-service-desk.dto";\nimport { UpdateParentDto } from "./dto/update-parent.dto";');

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', code);
