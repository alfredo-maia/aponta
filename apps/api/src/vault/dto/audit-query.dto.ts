import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { CredentialAction } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Início do intervalo de data/hora (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Fim do intervalo de data/hora (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo atendente (userId) que executou a ação' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filtra por tipo de ação', enum: CredentialAction })
  @IsOptional()
  @IsEnum(CredentialAction)
  action?: CredentialAction;

  @ApiPropertyOptional({ description: 'Busca livre por Cofre, pasta ou senha (targetName)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Página da paginação', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página', example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;
}
