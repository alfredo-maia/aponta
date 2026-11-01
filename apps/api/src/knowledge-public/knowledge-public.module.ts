import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicKnowledgeController } from './knowledge-public.controller';
import { PublicKnowledgeService } from './knowledge-public.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicKnowledgeController],
  providers: [PublicKnowledgeService],
})
export class KnowledgePublicModule {}
