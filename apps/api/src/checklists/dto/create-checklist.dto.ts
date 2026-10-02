import { IsNotEmpty, IsString } from 'class-validator';

export class CreateChecklistDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}
