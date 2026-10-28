import { Module } from '@nestjs/common';
import { KnowledgeAttachmentsService } from './knowledge-attachments.service';
import { KnowledgeAttachmentsController } from './knowledge-attachments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ArticlesModule } from '../articles/articles.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, ArticlesModule, PermissionsModule],
  controllers: [KnowledgeAttachmentsController],
  providers: [KnowledgeAttachmentsService],
})
export class KnowledgeAttachmentsModule {}
