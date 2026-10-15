import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StopPreAppointmentDto {
  @ApiPropertyOptional({
    description: 'Instante de término (ISO 8601). Se omitido, usa o momento atual.',
    example: '2026-10-15T15:10:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  ending?: string;

  @ApiPropertyOptional({
    description: 'Horário de término em Brasília (HH:mm). Calculado do ending se omitido.',
    example: '12:10',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}
