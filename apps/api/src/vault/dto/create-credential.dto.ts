import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCredentialDto {
  @ApiProperty({ description: 'Nome de identificação (ex: Servidor DB PRD)' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Nome de usuário (login)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Senha ou segredo criptografado' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ description: 'URL de acesso' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Notas ou instruções adicionais' })
  @IsOptional()
  @IsString()
  description?: string;
}
