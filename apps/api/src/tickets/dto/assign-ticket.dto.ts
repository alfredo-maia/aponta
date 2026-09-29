import { IsUUID } from 'class-validator';

/**
 * Small deviation from the brief's file list: a dedicated DTO for the
 * assign endpoint (PATCH /tickets/:id/assign) so `agentId` is never
 * accepted through the general-purpose UpdateTicketDto.
 */
export class AssignTicketDto {
  @IsUUID()
  agentId!: string;
}
