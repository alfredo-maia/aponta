import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  defaultServiceDeskId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  defaultPriority?: TicketPriority;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
