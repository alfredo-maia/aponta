import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class UpdateServiceDeskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];
}
