import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateServiceDeskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
