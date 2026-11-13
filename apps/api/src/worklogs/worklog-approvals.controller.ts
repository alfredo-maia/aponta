import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { WorklogApprovalsService } from './worklog-approvals.service';
import { RejectWorklogApprovalDto } from './dto/reject-worklog-approval.dto';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

/** DMTE-462 T5: a permissão de cada tipo é conferida no serviço, que também filtra a lista. */
@UseGuards(JwtAuthGuard)
@Controller('worklog-approvals')
export class WorklogApprovalsController {
  constructor(private readonly approvals: WorklogApprovalsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.approvals.list(req.user);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.approvals.approve(id, req.user);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: RejectWorklogApprovalDto, @Req() req: AuthenticatedRequest) {
    return this.approvals.reject(id, body?.note, req.user);
  }
}
