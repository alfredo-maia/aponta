import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority } from '@prisma/client';

/**
 * Fields a caller may set when creating a ticket. Deliberately excludes
 * `protocol`, `status`, `requesterId` and `agentId` — those are always
 * server-derived (protocol/status) or derived from the authenticated
 * caller (requesterId), never client-controlled. See TicketsService.create.
 */
export class CreateTicketDto {

  @IsOptional()
  @IsUUID()
  catalogItemId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUUID()
  serviceDeskId!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
