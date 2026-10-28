import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { CnpjLookupService } from './cnpj-lookup.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, CnpjLookupService],
})
export class OrganizationsModule {}
