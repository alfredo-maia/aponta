import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Short description of the folder' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Free-text icon (e.g. an emoji)' })
  @IsOptional()
  @IsString()
  icon?: string;
}
