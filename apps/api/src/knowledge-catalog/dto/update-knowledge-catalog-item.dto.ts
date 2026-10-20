import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateKnowledgeCatalogItemDto {
  @ApiPropertyOptional({ description: 'Service catalog item name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Short description of the service catalog item' })
  @IsOptional()
  @IsString()
  description?: string;
}
