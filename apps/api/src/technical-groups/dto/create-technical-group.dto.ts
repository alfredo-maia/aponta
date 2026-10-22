import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTechnicalGroupDto {
  @ApiProperty({ description: 'Technical group name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Short description of the group' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Send the daily worklog email to this group',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dailyWorklogEmailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable the schedule/agenda feature', default: true })
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;
}
