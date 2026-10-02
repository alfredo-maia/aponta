import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Fields a caller may set when creating a ticket. Deliberately excludes
 * `protocol`, `status`, `requesterId` and `agentId` — those are always
 * server-derived (protocol/status) or derived from the authenticated
 * caller (requesterId), never client-controlled. See TicketsService.create.
 */
export class CreateTicketDto {

  @ApiPropertyOptional({ description: 'Optional ID of the Catalog Item to bind this ticket to.', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  catalogItemId?: string;

  @ApiProperty({ description: 'Short summary or title of the issue.', example: 'Login page is returning 500' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Detailed markdown or text body describing the ticket.', example: 'When I click the login button after typing my email...' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'The Service Desk UUID this ticket should be routed to.', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  serviceDeskId!: string;

  @ApiPropertyOptional({ description: 'The explicit priority of the ticket.', enum: TicketPriority, example: 'HIGH' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
