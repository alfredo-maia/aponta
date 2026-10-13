import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Título do compromisso ou alocação' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Data e hora de início (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ description: 'Data e hora de término (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Tipo de compromisso: AGENDA (geral), ABSENCE (ausência) ou VACATION (férias)',
    enum: AppointmentType,
    default: AppointmentType.AGENDA,
  })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiPropertyOptional({ description: 'ID do usuário/técnico responsável (opcional, defaults para o usuário logado)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'ID da organização/cliente vinculada' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'ID do chamado vinculado' })
  @IsOptional()
  @IsString()
  ticketId?: string;
}
