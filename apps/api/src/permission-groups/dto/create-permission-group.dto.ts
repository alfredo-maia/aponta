import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PERMISSION_KEYS } from '../permission-catalog';

export class CreatePermissionGroupDto {
  @ApiProperty({ description: 'Permission group name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Short description of the group' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission keys from the catalog granted to this group',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions?: string[];
}
