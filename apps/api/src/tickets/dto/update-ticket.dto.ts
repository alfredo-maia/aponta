import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

/**
 * Fields an AGENT/ADMIN may update on an existing ticket. Does NOT include
 * `agentId` (use the dedicated `assign` endpoint) or `status` (use the
 * dedicated `changeStatus` endpoint, which enforces the state machine).
 */
export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /**
   * DMTE-106: `null` clears the vínculo ("Não definido"); the global
   * ValidationPipe's whitelist/forbidNonWhitelisted would otherwise strip or
   * reject an explicit null, so `@ValidateIf` only runs `@IsString` when a
   * value is actually present.
   */
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  serviceTypeId?: string | null;
}
