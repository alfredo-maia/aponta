import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserActiveDto {
  @ApiProperty({
    description:
      'Define se o usuário está ativo (consegue autenticar) ou inativo (bloqueado para login, histórico permanece legível).',
  })
  @IsBoolean()
  active!: boolean;
}
