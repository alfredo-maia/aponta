import { Module } from '@nestjs/common';
import { WorklogsController } from './worklogs.controller';
import { WorklogsService } from './worklogs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { MailModule } from '../mail/mail.module';
import { WorklogAutoCloseService } from './worklog-autoclose.service';

@Module({
  imports: [PrismaModule, AuthModule, CommentsModule, TicketsModule, PermissionsModule, MailModule],
  controllers: [WorklogsController],
  providers: [WorklogsService, WorklogAutoCloseService],
  exports: [WorklogsService, WorklogAutoCloseService],
})
export class WorklogsModule {}
