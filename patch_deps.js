const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/scheduling/scheduling.module.ts', 'utf8');

code = code.replace(
  /export class SchedulingModule \{\}/,
  `import { PrismaModule } from '../prisma/prisma.module';\n\n@Module({\n  imports: [PrismaModule],\n  providers: [SlaEscalationCron],\n})\nexport class SchedulingModule {}`
);

code = code.replace(/@Module\(\{\n  providers: \[SlaEscalationCron\],\n\}\)/, "");

fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/scheduling/scheduling.module.ts', code);
