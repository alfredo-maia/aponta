import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BillingFilterDto {
  @ApiPropertyOptional({ description: 'Contrato vinculado ao apontamento' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Início inclusivo do intervalo de ciclos mensais (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fim exclusivo do intervalo de ciclos mensais (ISO 8601). Segmentos históricos não são rateados.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
