import { Module } from '@nestjs/common';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { KnowledgeCatalogController } from './knowledge-catalog.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeCatalogController],
  providers: [KnowledgeCatalogService],
})
export class KnowledgeCatalogModule {}
