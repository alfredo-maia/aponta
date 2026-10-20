import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateKnowledgeCatalogItemDto {
  @ApiProperty({ description: 'Service catalog item name', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'Short description of the service catalog item' })
  @IsOptional()
  @IsString()
  description?: string;
}
