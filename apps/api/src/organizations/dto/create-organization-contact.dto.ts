import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
