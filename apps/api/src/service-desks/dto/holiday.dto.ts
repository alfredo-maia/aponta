import { IsDateString, IsString } from 'class-validator';

export class HolidayDto {
  @IsDateString()
  date!: string;

  @IsString()
  name!: string;
}
