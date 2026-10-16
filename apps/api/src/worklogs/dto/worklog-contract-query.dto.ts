import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class WorklogContractQueryDto {
  @ApiProperty({ description: 'Início da execução (ISO 8601)' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Fim da execução (ISO 8601)' })
  @IsDateString()
  endTime!: string;
}
