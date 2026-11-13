import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorklogApprovalType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { APPROVAL_TYPES } from './worklog-approval';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const TYPES = Object.keys(APPROVAL_TYPES) as WorklogApprovalType[];

/**
 * DMTE-462 T5: decisão das liberações de apontamento. A permissão é a do tipo de cada apontamento e não há desvio
 * por role (o ADMIN também precisa estar num grupo); ninguém decide o próprio apontamento.
 */
@Injectable()
export class WorklogApprovalsService {
  private readonly logger = new Logger(WorklogApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly mail: MailService,
  ) {}

  /** Pendentes dos tipos que a pessoa libera; sem valores financeiros. */
  async list(user: CurrentUserPayload) {
    const allowed: WorklogApprovalType[] = [];
    for (const type of TYPES) {
      if (await this.permissions.hasPermission(user.id, APPROVAL_TYPES[type].permission)) allowed.push(type);
    }
    if (allowed.length === 0) return [];
    return this.prisma.worklog.findMany({
      where: { approvalStatus: 'PENDING', approvalType: { in: allowed }, voidedAt: null },
      select: {
        id: true, ticketId: true, minutes: true, startTime: true, endTime: true, description: true, attendanceType: true, createdAt: true,
        approvalType: true, approvalStatus: true, approvalReason: true,
        ticket: { select: { id: true, protocol: true, title: true } },
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string, user: CurrentUserPayload) {
    const row = await this.decidable(id, user);
    const { count } = await this.prisma.worklog.updateMany({
      where: { id, approvalStatus: 'PENDING' },
      data: { approvalStatus: 'APPROVED', approvalDecidedBy: user.id, approvalDecidedAt: new Date() },
    });
    if (count === 0) throw new BadRequestException('Esta liberação já foi decidida');
    await this.notifyDecision(row, true);
    return { id, approvalStatus: 'APPROVED' as const };
  }

  /** Negar estorna o apontamento (some da conta e do faturamento) e exige o motivo. */
  async reject(id: string, note: string | undefined, user: CurrentUserPayload) {
    const reason = note?.trim();
    if (!reason) throw new BadRequestException('Informe o motivo da negação');
    const row = await this.decidable(id, user);
    const now = new Date();
    const { count } = await this.prisma.worklog.updateMany({
      where: { id, approvalStatus: 'PENDING' },
      data: { approvalStatus: 'REJECTED', voidedAt: now, voidedBy: user.id, approvalDecidedBy: user.id, approvalDecidedAt: now, approvalDecisionNote: reason },
    });
    if (count === 0) throw new BadRequestException('Esta liberação já foi decidida');
    await this.notifyDecision(row, false, reason);
    return { id, approvalStatus: 'REJECTED' as const };
  }

  /** Avisa por e-mail quem libera o tipo, menos o autor. Falha de envio é registrada e não desfaz nada. */
  async notifyPending(worklog: { id: string; ticketId: string; authorId: string; approvalType?: string | null; approvalReason?: string | null; author?: { name: string } | null }): Promise<void> {
    try {
      const type = APPROVAL_TYPES[worklog.approvalType as WorklogApprovalType];
      if (!type) return;
      const ticket = await this.prisma.ticket.findUnique({ where: { id: worklog.ticketId }, select: { protocol: true, title: true } });
      if (!ticket) return;
      const approvers = (await this.permissions.usersWithPermission(type.permission)).filter((u) => u.id !== worklog.authorId);
      const author = worklog.author?.name ?? 'Um consultor';
      const body = (name: string, title: string, reason: string) =>
        `${name} lançou um apontamento no ticket ${ticket.protocol} (${title}) que depende da sua liberação (${type.label}). ${reason} Acesse "Liberações" no Aponta para liberar ou negar.`;
      const reason = worklog.approvalReason ?? '';
      const subject = `Liberação pendente: ${type.label} no ticket ${ticket.protocol}`;
      const text = body(author, ticket.title, reason);
      const html = `<p>${body(escapeHtml(author), escapeHtml(ticket.title), escapeHtml(reason))}</p>`;
      for (const approver of approvers) {
        await this.send({ to: approver.email, subject, text, html });
      }
    } catch (cause) {
      this.logger.error(`Falha ao avisar a liberação pendente ${worklog.id}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  private async decidable(id: string, user: CurrentUserPayload) {
    const row = await this.prisma.worklog.findUnique({
      where: { id },
      include: { ticket: { select: { protocol: true, title: true } }, author: { select: { id: true, name: true, email: true } } },
    });
    if (!row || !row.approvalType) throw new NotFoundException('Liberação não encontrada');
    if (!(await this.permissions.hasPermission(user.id, APPROVAL_TYPES[row.approvalType].permission))) {
      throw new ForbiddenException('Sem permissão para decidir este tipo de liberação');
    }
    // Quem lançou em nome do consultor (ADMIN com authorId) também não decide.
    if (row.authorId === user.id || row.approvalRequestedBy === user.id) throw new ForbiddenException('Ninguém decide o próprio apontamento');
    if (row.approvalStatus !== 'PENDING' || row.voidedAt) throw new BadRequestException('Esta liberação já foi decidida');
    return row;
  }

  private async notifyDecision(
    row: { approvalType: WorklogApprovalType | null; ticket: { protocol: string; title: string }; author: { name: string; email: string } },
    approved: boolean,
    note?: string,
  ) {
    const label = row.approvalType ? APPROVAL_TYPES[row.approvalType].label : 'Apontamento';
    const verdict = approved ? 'liberado' : 'negado';
    const body = (title: string, why: string) =>
      `O apontamento (${label}) no ticket ${row.ticket.protocol} (${title}) foi ${verdict}.${why}${approved ? '' : ' O apontamento foi estornado.'}`;
    const text = body(row.ticket.title, note ? ` Motivo: ${note}.` : '');
    const html = `<p>${body(escapeHtml(row.ticket.title), note ? ` Motivo: ${escapeHtml(note)}.` : '')}</p>`;
    await this.send({ to: row.author.email, subject: `Apontamento ${verdict}: ticket ${row.ticket.protocol}`, text, html });
  }

  private async send(mail: { to: string; subject: string; text: string; html: string }) {
    try {
      await this.mail.sendEmail(mail);
    } catch (cause) {
      this.logger.error(`Falha ao enviar e-mail para ${mail.to}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
}
