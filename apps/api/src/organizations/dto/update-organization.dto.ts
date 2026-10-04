import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;
}
