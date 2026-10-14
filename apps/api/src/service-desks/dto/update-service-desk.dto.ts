import { PartialType } from '@nestjs/swagger';
import { CreateServiceDeskDto } from './create-service-desk.dto';

export class UpdateServiceDeskDto extends PartialType(CreateServiceDeskDto) {}
