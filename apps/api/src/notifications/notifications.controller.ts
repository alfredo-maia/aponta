import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/** DMTE-462 T6: stub neutro (sem o comportamento), substituído na implementação. */
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() _req: AuthenticatedRequest) {
    return this.notifications.list('');
  }

  @Post('read-all')
  readAll(@Req() _req: AuthenticatedRequest) {
    return this.notifications.markAllRead('');
  }

  @Post(':id/read')
  read(@Param('id') _id: string, @Req() _req: AuthenticatedRequest) {
    return this.notifications.markRead('', '');
  }
}
