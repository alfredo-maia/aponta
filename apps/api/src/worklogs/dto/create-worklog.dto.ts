import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, TicketStatus, ValuationType } from '@prisma/client';

export class CreateWorklogDto {
  @ApiProperty({ description: 'Dia e horário de início do apontamento (ISO 8601)', example: '2026-10-13T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ description: 'Dia e horário de término do apontamento (ISO 8601)', example: '2026-10-13T09:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Tipo de atendimento',
    enum: AttendanceType,
    default: AttendanceType.REMOTE,
  })
  @IsOptional()
  @IsEnum(AttendanceType)
  attendanceType?: AttendanceType;

  @ApiProperty({ description: 'Descrição das atividades executadas', example: 'Análise de logs e correção de query' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Indica se as horas são faturáveis', default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional({ description: 'ID do autor/técnico (apenas ADMIN pode definir para terceiros)' })
  @IsUUID()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Novo status do chamado a aplicar ao salvar o apontamento (paridade "Próximo estágio" do TiFlux)',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  nextStatus?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Se true, publica a descrição do apontamento como um comentário visível ao cliente',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendAsReply?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de valorização do apontamento',
    enum: ValuationType,
    default: ValuationType.CONTRACT,
  })
  @IsOptional()
  @IsEnum(ValuationType)
  valuationType?: ValuationType;

  @ApiPropertyOptional({ description: 'Contrato elegível da organização; obrigatório em caso de múltiplos contratos' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Valor manual do apontamento (obrigatório quando valuationType = MANUAL)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(21474836.47)
  value?: number;
}
