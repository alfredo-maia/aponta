import { Module } from '@nestjs/common';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { KnowledgeFoldersController } from './knowledge-folders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeFoldersController],
  providers: [KnowledgeFoldersService],
})
export class KnowledgeFoldersModule {}
