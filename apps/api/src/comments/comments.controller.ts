import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/**
 * Comment timeline endpoints, nested under the ticket resource.
 * Requires VIEW_ADD_INTERNAL_COMMUNICATION (DMTE-84, Tarefa 2).
 */
@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('VIEW_ADD_INTERNAL_COMMUNICATION')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post(':ticketId/comments')
  create(
    @Param('ticketId') ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commentsService.create(ticketId, createCommentDto, req.user);
  }

  @Get(':ticketId/comments')
  findByTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commentsService.findByTicket(ticketId, req.user);
  }
}
