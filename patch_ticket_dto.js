const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/dto/create-ticket.dto.ts', 'utf8');

code = code.replace(
  "import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';",
  "import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';"
);

const newProps = `

  @IsOptional()
  @IsUUID()
  catalogItemId?: string;
`;
code = code.replace("export class CreateTicketDto {", "export class CreateTicketDto {" + newProps);
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/dto/create-ticket.dto.ts', code);
