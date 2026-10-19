import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type ArticleSort = 'title_asc' | 'title_desc' | 'updated_desc';

export class ArticleQueryDto {
  @ApiPropertyOptional({ description: 'Search term applied to title and content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tags; matches articles with any of them' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['title_asc', 'title_desc', 'updated_desc'],
  })
  @IsOptional()
  @IsIn(['title_asc', 'title_desc', 'updated_desc'])
  sort?: ArticleSort;

  @ApiPropertyOptional({ description: 'Filter articles belonging to this knowledge folder' })
  @IsOptional()
  @IsString()
  folderId?: string;
}
