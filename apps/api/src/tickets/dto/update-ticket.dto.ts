import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '@prisma/client';

/**
 * Fields an AGENT/ADMIN may update on an existing ticket. Does NOT include
 * `agentId` (use the dedicated `assign` endpoint) or `status` (use the
 * dedicated `changeStatus` endpoint, which enforces the state machine).
 */
export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
