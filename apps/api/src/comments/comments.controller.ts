import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/**
 * Comment timeline endpoints, nested under the ticket resource.
 * Currently restricted to AGENT and ADMIN roles per business requirements.
 */
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ADMIN)
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
