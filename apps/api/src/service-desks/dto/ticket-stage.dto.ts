import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketStageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateTicketStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transitionToIds?: string[];
}

export class ReorderTicketStagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}

export class ChangeTicketStageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  stageId!: string;
}
