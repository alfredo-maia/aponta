import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '@prisma/client';

export class CreateContractDto {
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
  monthlyValue?: number;

  @ApiPropertyOptional({ description: 'Valor do último adendo financeiro' })
  @IsOptional()
  @IsNumber()
  lastAmendmentValue?: number;

  @ApiPropertyOptional({ description: 'Limite de horas mensais (quando aplicável)' })
  @IsOptional()
  @IsNumber()
  hoursLimit?: number;

  @ApiPropertyOptional({ description: 'Data base de reajuste', example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  adjustmentDate?: string;
}
