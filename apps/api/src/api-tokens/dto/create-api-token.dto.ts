import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateApiTokenDto {
  @ApiProperty({ description: 'Nome identificador do token (ex: "Claude Desktop")', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}
