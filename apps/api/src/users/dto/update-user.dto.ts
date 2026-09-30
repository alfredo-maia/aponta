import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  // Null is allowed by Prisma when passing it down, but class-validator requires custom decorator if we want exact null check. For this case we can allow empty string to mean null or just accept it loosely
  organizationId?: string | null;
}
