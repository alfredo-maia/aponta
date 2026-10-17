import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WorklogContextDto {
  @ApiProperty({ description: 'Empresa comercial do chamado; regularização administrativa antes do primeiro lançamento' })
  @IsUUID()
  organizationId!: string;
}
