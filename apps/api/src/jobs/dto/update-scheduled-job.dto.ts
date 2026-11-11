import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateScheduledJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cron?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
