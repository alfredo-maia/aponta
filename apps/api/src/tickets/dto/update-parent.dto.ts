import { IsOptional, IsString } from 'class-validator';

export class UpdateParentDto {
  @IsString()
  @IsOptional()
  parentProtocol?: string | null;
}
