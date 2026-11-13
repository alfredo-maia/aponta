import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectWorklogApprovalDto {
  @ApiPropertyOptional({ description: 'Motivo da negação, obrigatório (o serviço recusa se vier vazio).', example: 'Horário não confere com o atendimento' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
