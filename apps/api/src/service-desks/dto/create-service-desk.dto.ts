import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateServiceDeskDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];
}
