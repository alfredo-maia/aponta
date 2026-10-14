import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AddSlaHoursDto {
  @ApiProperty({ description: 'Horas de expediente a adicionar aos prazos de SLA', example: 2 })
  @IsNumber()
  @Min(0.01)
  hours!: number;
}
