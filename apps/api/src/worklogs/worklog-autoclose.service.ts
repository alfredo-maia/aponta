import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { autoCloseDecision, LockReason } from './pre-appointment-clock';

const REASON_TEXT: Record<LockReason, string> = {
  LIMIT: 'o tempo trabalhado atingiu a duração da agenda',
  PAUSE_EXPIRED: 'a pausa passou de 2 dias',
  WINDOW_CLOSED: 'a janela da agenda fechou com o cronômetro pausado',
};

function brasiliaHhMm(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const hour = (parts.find((part) => part.type === 'hour')?.value ?? '00').replace('24', '00');
  return `${hour.padStart(2, '0')}:${parts.find((part) => part.type === 'minute')?.value ?? '00'}`;
}

/**
 * DMTE-462 T4: tarefa agendada. Fecha os cronômetros abertos que passaram do limite da agenda ou da pausa,
 * trava o que fechou e avisa por e-mail o consultor e os membros do grupo de aviso.
 */
@Injectable()
export class WorklogAutoCloseService {
  private readonly logger = new Logger(WorklogAutoCloseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly mail: MailService,
  ) {}

  async run(now: Date): Promise<number> {
    const open = await this.prisma.preAppointment.findMany({
      where: { ending: null },
      include: { author: { select: { id: true, name: true, email: true } }, ticket: { select: { id: true, protocol: true, title: true } } },
    });
    let closed = 0;
    for (const pre of open) {
      const decision = autoCloseDecision(pre, now);
      if (!decision) continue;
      // `ending: null` no filtro: se outra instância fechou antes, nenhuma linha muda e ninguém é avisado de novo.
      const { count } = await this.prisma.preAppointment.updateMany({
        where: { id: pre.id, ending: null },
        data: { ending: decision.endsAt, endTime: brasiliaHhMm(decision.endsAt), pausedAt: null, lockedReason: decision.reason },
      });
      if (count === 0) continue;
      closed += 1;
      await this.notify(pre, decision.endsAt, decision.reason);
    }
    return closed;
  }

  private async notify(
    pre: { author: { id: string; name: string; email: string }; ticket: { protocol: string; title: string } },
    endsAt: Date,
    reason: LockReason,
  ) {
    const managers = await this.permissions.usersWithPermission('RECEIVE_WORKLOG_AUTOCLOSE_ALERT');
    const recipients = new Map([pre.author, ...managers].map((user) => [user.email, user]));
    const subject = `Cronômetro encerrado automaticamente: ticket ${pre.ticket.protocol}`;
    const html = `<p>O cronômetro de <strong>${pre.author.name}</strong> no ticket ${pre.ticket.protocol} (${pre.ticket.title}) foi encerrado automaticamente porque ${REASON_TEXT[reason]}.</p>`
      + `<p>Fim registrado: ${brasiliaHhMm(endsAt)}. Este cronômetro só muda com aprovação.</p>`;
    const text = `O cronômetro de ${pre.author.name} no ticket ${pre.ticket.protocol} (${pre.ticket.title}) foi encerrado automaticamente porque ${REASON_TEXT[reason]}. Fim registrado: ${brasiliaHhMm(endsAt)}. Este cronômetro só muda com aprovação.`;
    for (const email of recipients.keys()) {
      try {
        await this.mail.sendEmail({ to: email, subject, text, html });
      } catch (cause) {
        this.logger.error(`Falha ao avisar ${email}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }
  }
}
