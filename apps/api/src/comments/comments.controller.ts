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
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/**
 * Comment timeline endpoints, nested under the ticket resource.
 * No RolesGuard here by design: all roles may create/read comments, and the
 * role-dependent rules (CLIENT ownership, isInternal write/read control) are
 * enforced inside CommentsService where they can be unit-tested directly —
 * the same split TicketsController/TicketsService uses for findOne.
 */
@Controller('tickets')
@UseGuards(JwtAuthGuard)
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
