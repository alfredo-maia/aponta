import { PartialType } from '@nestjs/swagger';
import { CreateTechnicalGroupDto } from './create-technical-group.dto';

export class UpdateTechnicalGroupDto extends PartialType(CreateTechnicalGroupDto) {}
