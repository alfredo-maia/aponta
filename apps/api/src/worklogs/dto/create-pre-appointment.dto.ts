import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePreAppointmentDto {
  @ApiPropertyOptional({
    description: 'Instante de início (ISO 8601). Se omitido, usa o momento atual.',
    example: '2026-10-15T14:36:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  beginning?: string;

  @ApiPropertyOptional({
    description: 'Horário de início em Brasília (HH:mm). Calculado do beginning se omitido.',
    example: '11:36',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  initTime?: string;
}
