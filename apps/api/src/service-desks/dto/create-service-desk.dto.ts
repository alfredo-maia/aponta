import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceDeskReviewType,
  ServiceDeskSectionKey,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

export class DeskPriorityPatchDto {
  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  ticketPriority!: TicketPriority;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class DeskSectionPatchDto {
  @ApiProperty({ enum: ServiceDeskSectionKey })
  @IsEnum(ServiceDeskSectionKey)
  key!: ServiceDeskSectionKey;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateServiceDeskDto {
  @ApiProperty({ description: 'Nome interno da mesa.' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Nome de exibição da mesa.' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Descrição da mesa.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'IDs dos agentes vinculados.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'IDs dos clientes (N:N). Vazio = mesa global.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'IDs dos grupos de atendentes.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentGroupIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaCriticalResponseHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaCriticalResolveHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaHighResponseHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaHighResolveHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaMediumResponseHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaMediumResolveHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaLowResponseHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  slaLowResolveHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptingNewTickets?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  internalUse?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  worklogsWithValuation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowCrossDeskInteraction?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowCancelTicket?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  catalogRequiredOnOpen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  slaControlEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAddSlaHours?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowPauseResumeSla?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reviewFlowEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  evaluationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openByAgentsOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireRequesterName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireRequesterEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireRequesterPhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireRequesterExtension?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireResourceGroup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireAttachments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  listedGroupsOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  unlistedCanCreateTicket?: boolean;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  defaultOpenStatus?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  defaultClosedStatus?: TicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReopenUnbilled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReopenBilled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reopenDefaultReplyUnbilled?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reopenDefaultReplyBilled?: string;

  @ApiPropertyOptional({ enum: ServiceDeskReviewType })
  @IsOptional()
  @IsEnum(ServiceDeskReviewType)
  reviewType?: ServiceDeskReviewType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewDeadlineDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reviewNotifyEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reviewReminder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reviewReapplyReopen?: boolean;

  @ApiPropertyOptional({ type: [DeskPriorityPatchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeskPriorityPatchDto)
  priorities?: DeskPriorityPatchDto[];

  @ApiPropertyOptional({ type: [DeskSectionPatchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeskSectionPatchDto)
  ticketSections?: DeskSectionPatchDto[];
}
