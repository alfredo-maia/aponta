import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt, Min } from 'class-validator';

export class CreateServiceDeskDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  /** Tiflux-parity (#57): vincula esta mesa a um ou mais clientes (N:N). Vazio/omitido = mesa global/compartilhada. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  slaCriticalResponseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaCriticalResolveHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaHighResponseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaHighResolveHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaMediumResponseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaMediumResolveHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaLowResponseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaLowResolveHours?: number;
}
