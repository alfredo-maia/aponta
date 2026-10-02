import { IsNotEmpty, IsString } from 'class-validator';

export class AddChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
