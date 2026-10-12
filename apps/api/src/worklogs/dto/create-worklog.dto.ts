import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorklogDto {
  @ApiProperty({ description: 'Minutos trabalhados no chamado', example: 60 })
  @IsInt()
  @Min(1)
  minutes!: number;

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
}
