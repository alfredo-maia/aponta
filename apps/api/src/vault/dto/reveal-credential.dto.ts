import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type RevealField = 'username' | 'password';
export type RevealIntent = 'reveal' | 'copy';

export class RevealCredentialDto {
  @ApiProperty({ description: 'Campo a revelar/copiar', enum: ['username', 'password'] })
  @IsIn(['username', 'password'])
  field!: RevealField;

  @ApiProperty({
    description:
      'Uso pretendido: "reveal" mostra o valor na tela (gera REVEAL_CREDENTIAL), "copy" apenas copia para a área de transferência sem exibir (gera COPY_USERNAME/COPY_PASSWORD).',
    enum: ['reveal', 'copy'],
  })
  @IsIn(['reveal', 'copy'])
  intent!: RevealIntent;
}
