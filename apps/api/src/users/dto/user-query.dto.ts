import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou e-mail' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtra por grupo de atendentes (TechnicalGroup)' })
  @IsOptional()
  @IsUUID()
  technicalGroupId?: string;

  @ApiPropertyOptional({ description: 'Filtra por grupo de permissões (PermissionGroup)' })
  @IsOptional()
  @IsUUID()
  permissionGroupId?: string;

  @ApiPropertyOptional({ description: 'Página da paginação', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página', example: '20' })
  @IsOptional()
  @IsString()
  pageSize?: string;
}
