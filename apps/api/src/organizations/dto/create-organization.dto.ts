import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  /** Tiflux-parity: documento único PF (CPF) além do CNPJ já existente (gap #1 do #49, issue #56). */
  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  /** Tiflux-parity: ativar/inativar cliente (gap #5 do #49, issue #56). Default true via schema. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** Tiflux-parity: aba "Perfil do Cliente" (gap #6 do #49, issue #56). */
  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  healthStatus?: string;

  /** Tiflux-parity (#57): campos extras da aba "Informações" do cliente real. */
  @IsOptional()
  @IsString()
  workFolder?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  visibleToClients?: boolean;

  @IsOptional()
  @IsBoolean()
  quarterlyBilling?: boolean;
}
