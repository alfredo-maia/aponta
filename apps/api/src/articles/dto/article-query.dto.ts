import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ArticleQueryDto {
  @ApiPropertyOptional({ description: 'Search term applied to title and content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific tag' })
  @IsOptional()
  @IsString()
  tag?: string;
}
