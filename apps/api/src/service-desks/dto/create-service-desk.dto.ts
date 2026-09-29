import { IsString, IsNotEmpty } from 'class-validator';

export class CreateServiceDeskDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
