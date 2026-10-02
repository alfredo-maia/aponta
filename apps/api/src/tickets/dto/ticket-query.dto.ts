import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { TicketStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TicketQueryDto {
  @ApiPropertyOptional({ description: 'Termo de busca textual para encontrar o ticket (título, protocolo ou descrição).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página da paginação', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Quantidade de relatórios por página', example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UUID de um ServiceDesk específico' })
  @IsOptional()
  @IsUUID()
  serviceDeskId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por Status', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
