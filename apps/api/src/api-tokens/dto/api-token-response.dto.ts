import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiTokenResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  lastUsedAt?: Date | null;
}

export class ApiTokenCreatedResponseDto extends ApiTokenResponseDto {
  @ApiProperty({ description: 'Valor puro do token — exibido apenas uma vez. Guarde-o em local seguro.' })
  token!: string;
}
