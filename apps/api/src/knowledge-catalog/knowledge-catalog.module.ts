import { Module } from '@nestjs/common';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeCatalogController } from './knowledge-catalog.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [KnowledgeCatalogController],
  providers: [KnowledgeCatalogService],
})
export class KnowledgeCatalogModule {}
