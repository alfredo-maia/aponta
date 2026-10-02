import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  text?: string;
}
