import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ArticleVisibility } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Article content in markdown or HTML' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'PUBLIC: visible to everyone, incl. clients without login. PRIVATE: only the author and whoever is in agentGroupIds/organizationIds can see it. Defaults to PUBLIC.',
    enum: ArticleVisibility,
  })
  @IsOptional()
  @IsEnum(ArticleVisibility)
  visibility?: ArticleVisibility;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'AgentGroup IDs allowed to see this article when it is PRIVATE', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentGroupIds?: string[];

  @ApiPropertyOptional({ description: 'Organization IDs allowed to see this article when it is PRIVATE', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationIds?: string[];

  @ApiPropertyOptional({ description: 'When true, a newly created Organization automatically gains access to this PRIVATE article' })
  @IsOptional()
  @IsBoolean()
  autoShareWithNewOrganizations?: boolean;

  @ApiPropertyOptional({ description: 'Service Catalog item IDs associated with this article', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCatalogItemIds?: string[];
}
