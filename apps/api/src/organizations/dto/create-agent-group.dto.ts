import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

/** Tiflux-parity (#57): Grupo de Atendentes — entidade por cliente. */
export class CreateAgentGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
