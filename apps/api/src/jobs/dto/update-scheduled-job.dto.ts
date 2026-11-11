import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateScheduledJobDto {
  @IsOptional()
  @IsString()
  cron?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
