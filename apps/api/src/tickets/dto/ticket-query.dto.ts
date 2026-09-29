import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class TicketQueryDto {
  @IsOptional()
  @IsUUID()
  serviceDeskId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
