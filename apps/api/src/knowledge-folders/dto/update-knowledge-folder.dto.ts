import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateKnowledgeFolderDto {
  @ApiPropertyOptional({ description: 'Folder name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Short description of the folder' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Free-text icon (e.g. an emoji)' })
  @IsOptional()
  @IsString()
  icon?: string;
}
