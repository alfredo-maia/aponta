import { Module } from '@nestjs/common';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { KnowledgeFoldersController } from './knowledge-folders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [KnowledgeFoldersController],
  providers: [KnowledgeFoldersService],
})
export class KnowledgeFoldersModule {}
