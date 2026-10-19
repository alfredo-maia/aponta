import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ description: 'Nome da pasta (ex: Servidores, VPNs)' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
