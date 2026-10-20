import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ArticleVisibility } from '@prisma/client';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'PUBLIC: visible to everyone, incl. clients without login. PRIVATE: only the author and whoever is in agentGroupIds/organizationIds can see it.',
    enum: ArticleVisibility,
  })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'AgentGroup IDs allowed to see this article when it is PRIVATE; replaces the whole list when provided', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentGroupIds?: string[];

  @ApiPropertyOptional({ description: 'Organization IDs allowed to see this article when it is PRIVATE; replaces the whole list when provided', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationIds?: string[];

  @ApiPropertyOptional({ description: 'When true, a newly created Organization automatically gains access to this PRIVATE article' })
  @IsOptional()
  @IsBoolean()
  autoShareWithNewOrganizations?: boolean;

  @ApiPropertyOptional({ description: 'Service Catalog item IDs associated with this article; replaces the whole list when provided', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCatalogItemIds?: string[];
}
