import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateCatalogItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsUUID()
  @IsNotEmpty()
  defaultServiceDeskId!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  defaultPriority?: TicketPriority;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
