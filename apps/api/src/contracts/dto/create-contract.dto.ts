import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsUUID, IsString, Matches, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '@prisma/client';

export class CreateContractDto {
  @ApiPropertyOptional({ description: 'Nome do contrato', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'Nome não pode estar vazio' })
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Início da vigência', type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'Término da vigência', type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional({ description: 'Franquia mensal em minutos', minimum: 0, maximum: 2147483647, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  includedMinutes?: number | null;

  @ApiPropertyOptional({ description: 'Tarifa por hora excedente em centavos; ausente significa desconhecida', minimum: 0, maximum: 2147483647, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  excessHourlyRateCents?: number | null;

  @ApiProperty({ description: 'ID da organização (Cliente) associada ao contrato', example: 'uuid-123' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ enum: ContractType, description: 'Tipo do contrato (cobertura fixa ou banco de horas)' })
  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;

  @ApiPropertyOptional({ description: 'Indica se o contrato está ativo' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Valor mensal do contrato em BRL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyValue?: number;

  @ApiPropertyOptional({ description: 'Valor do último adendo financeiro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lastAmendmentValue?: number;

  @ApiPropertyOptional({ description: 'Limite de horas mensais (quando aplicável)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  hoursLimit?: number;

  @ApiPropertyOptional({ description: 'Data base de reajuste', example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  adjustmentDate?: string;
}
