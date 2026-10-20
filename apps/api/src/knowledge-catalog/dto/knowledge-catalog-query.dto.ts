import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class KnowledgeCatalogQueryDto {
  @ApiPropertyOptional({
    description:
      'Search term matched against name/description via ILIKE (exact/partial) and pg_trgm similarity (typo-tolerant, fuzzy match)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
