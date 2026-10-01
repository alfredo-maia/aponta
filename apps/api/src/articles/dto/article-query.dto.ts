import { IsOptional, IsString } from 'class-validator';

export class ArticleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}
