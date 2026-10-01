import { IsUUID } from 'class-validator';

/**
 * Dedicated DTO for the changeServiceDesk endpoint
 * (PATCH /tickets/:id/service-desk), mirroring the pattern used by
 * AssignTicketDto/ChangeStatusDto: a narrow, purpose-built DTO instead of
 * widening the general-purpose UpdateTicketDto.
 */
export class ChangeServiceDeskDto {
  @IsUUID()
  serviceDeskId!: string;
}
