import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CredentialQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtra credenciais de uma pasta específica (UUID). Use o literal "root" para listar apenas credenciais sem pasta (raiz do cofre). Omitido = todas as pastas.',
  })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Busca textual por nome da credencial' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página da paginação', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página', example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;
}
