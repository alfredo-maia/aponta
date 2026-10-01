import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketStatus } from '@prisma/client';

import { IsString } from 'class-validator';
export class TicketQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsUUID()
  serviceDeskId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
