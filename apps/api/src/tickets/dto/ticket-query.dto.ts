import { IsEnum, IsOptional, IsUUID, IsString, IsIn } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Somente chamados atribuídos ao usuário autenticado ("Meus" no dashboard)', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  mine?: string;

  @ApiPropertyOptional({ description: 'Somente chamados abertos sem agente atribuído ("Não atendidos" no dashboard)', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  unassigned?: string;

  @ApiPropertyOptional({ description: 'Somente chamados pausados: ON_HOLD, PENDING_CUSTOMER ou PENDING_APPROVAL ("Pausados" no dashboard)', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  paused?: string;

  @ApiPropertyOptional({ description: 'Somente chamados abertos com SLA de resposta ou resolução estourado ("Vencidos" no dashboard)', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  overdue?: string;

  @ApiPropertyOptional({ description: 'Somente chamados não fechados (exclui RESOLVED e CLOSED) — usado para vincular um chamado a um compromisso da Agenda', example: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  notClosed?: string;
}
