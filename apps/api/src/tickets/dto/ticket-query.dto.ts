import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsString,
  IsIn,
  IsArray,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Whitelisted date field for the Busca avançada "Data" filter (D8/Q1). */
export type TicketDateField = 'createdAt' | 'closedAt';

/** Whitelisted sort fields for the Busca avançada / Kanban "Ordenar" (D8/D6). */
export type TicketSortField =
  | 'title'
  | 'protocol'
  | 'priority'
  | 'status'
  | 'agentId'
  | 'createdAt'
  | 'updatedAt'
  | 'responseDeadline'
  | 'resolveDeadline';

export const TICKET_SORT_FIELDS: TicketSortField[] = [
  'title',
  'protocol',
  'priority',
  'status',
  'agentId',
  'createdAt',
  'updatedAt',
  'responseDeadline',
  'resolveDeadline',
];

export class TicketQueryDto {
  @ApiPropertyOptional({
    description:
      'Termo de busca textual para encontrar o ticket (título, protocolo ou descrição).',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página da paginação', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de relatórios por página',
    example: '20',
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por UUID de um ServiceDesk específico',
  })
  @IsOptional()
  @IsUUID()
  serviceDeskId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por UUID da organização/cliente do solicitante',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por Status',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por Prioridade',
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description:
      'Somente chamados atribuídos ao usuário autenticado ("Meus" no dashboard)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  mine?: string;

  @ApiPropertyOptional({
    description:
      'Somente chamados abertos sem agente atribuído ("Não atendidos" no dashboard)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  unassigned?: string;

  @ApiPropertyOptional({
    description:
      'Somente chamados pausados: ON_HOLD, PENDING_CUSTOMER ou PENDING_APPROVAL ("Pausados" no dashboard)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  paused?: string;

  @ApiPropertyOptional({
    description:
      'Somente chamados abertos com SLA de resposta ou resolução estourado ("Vencidos" no dashboard)',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  overdue?: string;

  @ApiPropertyOptional({
    description:
      'Somente chamados não fechados (exclui RESOLVED e CLOSED) — usado para vincular um chamado a um compromisso da Agenda',
    example: 'true',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  notClosed?: string;

  @ApiPropertyOptional({
    description: 'Busca por substring do protocolo (Busca avançada "Número")',
  })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({
    description: 'Busca por substring do título (Busca avançada "Título")',
  })
  @IsOptional()
  @IsString()
  titleContains?: string;

  @ApiPropertyOptional({
    description:
      'Busca por substring do nome/e-mail do solicitante (Busca avançada "Solicitante")',
  })
  @IsOptional()
  @IsString()
  requesterQuery?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por UUID de um atendente específico',
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por uma lista de UUIDs de atendentes (filtro de avatares do Kanban, multi-seleção)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  agentIds?: string[];

  @ApiPropertyOptional({
    description: 'Filtrar por UUID de um estágio específico da mesa',
  })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({
    description:
      'Campo de data usado por dateFrom/dateTo: abertura (createdAt, padrão) ou fechamento (closedAt)',
    enum: ['createdAt', 'closedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'closedAt'])
  dateField?: TicketDateField;

  @ApiPropertyOptional({
    description: 'Data inicial (inclusive) do intervalo de dateField',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Data final (inclusive) do intervalo de dateField',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Campo de ordenação (whitelist); padrão é createdAt',
    enum: TICKET_SORT_FIELDS,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
