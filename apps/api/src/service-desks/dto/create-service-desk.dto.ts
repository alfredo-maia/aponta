import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt, Min } from 'class-validator';

export class CreateServiceDeskDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  /** Links this desk to a specific client (Tiflux-parity "Mesa do cliente"). Omit for a global/shared desk. */
  @IsOptional()
  @IsString()
  organizationId?: string;

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
