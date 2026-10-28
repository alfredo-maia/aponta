import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionGroupDto {
  @ApiPropertyOptional({ description: 'Permission group name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Short description of the group' })
  @IsOptional()
  @IsString()
  description?: string;
}
