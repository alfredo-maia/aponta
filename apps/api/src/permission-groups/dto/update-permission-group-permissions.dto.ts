import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { PERMISSION_KEYS } from '../permission-catalog';

/**
 * Dedicated endpoint/DTO for the "matriz de permissões" (checkbox grid):
 * replaces the group's entire permission set in one call, mirroring how the
 * Tiflux screen saves the whole matrix together rather than toggling one
 * checkbox per request.
 */
export class UpdatePermissionGroupPermissionsDto {
  @ApiProperty({
    description: 'Full replacement list of permission keys from the catalog',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions!: string[];
}
