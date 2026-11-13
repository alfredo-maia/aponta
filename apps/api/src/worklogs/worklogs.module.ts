import { Module } from '@nestjs/common';
import { WorklogsController } from './worklogs.controller';
import { WorklogsService } from './worklogs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { MailModule } from '../mail/mail.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorklogAutoCloseService } from './worklog-autoclose.service';
import { WorklogApprovalsService } from './worklog-approvals.service';
import { WorklogApprovalsController } from './worklog-approvals.controller';

@Module({
  imports: [PrismaModule, AuthModule, CommentsModule, TicketsModule, PermissionsModule, MailModule, FeatureFlagsModule, NotificationsModule],
  controllers: [WorklogsController, WorklogApprovalsController],
  providers: [WorklogsService, WorklogAutoCloseService, WorklogApprovalsService],
  exports: [WorklogsService, WorklogAutoCloseService],
})
export class WorklogsModule {}
