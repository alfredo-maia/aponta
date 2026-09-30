import { Controller, Patch, Param, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class CsatController {
  constructor(private prisma: PrismaService) {}
  @Patch(':id/csat')
  async rate(@Param('id') id: string, @Body() data: { score: number, comment?: string }, @CurrentUser() user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if(ticket?.requesterId !== user.sub) throw new UnauthorizedException("Só o autor avalia");
    return this.prisma.ticket.update({ where: { id }, data: { csatScore: data.score, csatComment: data.comment } });
  }
}