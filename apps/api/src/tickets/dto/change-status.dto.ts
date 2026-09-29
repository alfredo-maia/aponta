import { IsEnum } from 'class-validator';
import { TicketStatus } from '@prisma/client';

/**
 * Small deviation from the brief's file list: a dedicated DTO for the
 * changeStatus endpoint (PATCH /tickets/:id/status) so `status` is never
 * accepted through the general-purpose UpdateTicketDto (it must go through
 * TicketsService.changeStatus, which enforces the transition state machine).
 */
export class ChangeStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
