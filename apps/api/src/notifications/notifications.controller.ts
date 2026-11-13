import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/** DMTE-462 T6: cada rota age só com o id do usuário autenticado. */
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.notifications.list(req.user.id);
  }

  @Post('read-all')
  readAll(@Req() req: AuthenticatedRequest) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Post(':id/read')
  read(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notifications.markRead(id, req.user.id);
  }
}
