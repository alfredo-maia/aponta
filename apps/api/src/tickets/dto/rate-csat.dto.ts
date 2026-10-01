import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to rate a ticket's customer satisfaction (CSAT) after it has
 * been resolved. Only the ticket's requester may submit this (enforced
 * in CsatService, not here — DTOs only validate shape/range).
 */
export class RateCsatDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
