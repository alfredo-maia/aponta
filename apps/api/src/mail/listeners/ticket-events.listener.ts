import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import { ConfigService } from '@nestjs/config';

interface TicketPayload {
  ticket: any; // eslint-disable-line @typescript-eslint/no-explicit-any 
  requesterEmail?: string;
  agentEmail?: string;
}

interface CommentPayload extends TicketPayload {
  comment: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  authorEmail?: string;
}

@Injectable()
export class TicketEventsListener {
  
  private readonly appUrl: string;

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('WEB_ORIGIN') || 'http://localhost:3000';
  }

  @OnEvent('ticket.created')
  async handleTicketCreatedEvent(payload: TicketPayload) {
    if (!payload.requesterEmail) return;
    
    await this.mailService.sendEmail({
      to: payload.requesterEmail,
      subject: `[Aponta] O Chamado ${payload.ticket.protocol} foi aberto com sucesso`,
      text: `Olá!\n\nSeu chamado "${payload.ticket.title}" foi criado e está em nossa fila sob o protocolo ${payload.ticket.protocol}.\n\nAcompanhe o status aqui:\n${this.appUrl}/tickets/${payload.ticket.id}`,
    });
  }

  @OnEvent('ticket.assigned')
  async handleTicketAssignedEvent(payload: TicketPayload) {
    if (!payload.agentEmail) return;

    await this.mailService.sendEmail({
      to: payload.agentEmail,
      subject: `[Aponta] Novo chamado atribuído a você: ${payload.ticket.protocol}`,
      text: `Olá!\n\nO chamado "${payload.ticket.title}" foi atribuído a você.\n\nAcesse para atender:\n${this.appUrl}/tickets/${payload.ticket.id}`,
    });
  }

  @OnEvent('ticket.status_changed')
  async handleTicketStatusChangedEvent(payload: TicketPayload) {
    if (!payload.requesterEmail) return;

    if (payload.ticket.status === 'RESOLVED') {
      await this.mailService.sendEmail({
        to: payload.requesterEmail,
        subject: `[Aponta] Seu chamado ${payload.ticket.protocol} foi resolvido — avalie nosso atendimento`,
        text: `Olá!\n\nSeu chamado "${payload.ticket.title}" foi marcado como resolvido.\n\nGostaríamos muito de saber como foi sua experiência — deixe sua avaliação (nota e comentário) aqui:\n${this.appUrl}/tickets/${payload.ticket.id}\n\nSe o problema persistir, você também pode reabrir o chamado por lá.`,
      });
      return;
    }

    await this.mailService.sendEmail({
      to: payload.requesterEmail,
      subject: `[Aponta] Status do chamado ${payload.ticket.protocol} mudou para ${payload.ticket.status}`,
      text: `Olá!\n\nO status do seu chamado "${payload.ticket.title}" mudou para ${payload.ticket.status}.\n\nVeja mais detalhes aqui:\n${this.appUrl}/tickets/${payload.ticket.id}`,
    });
  }

  @OnEvent('ticket.commented')
  async handleTicketCommentedEvent(payload: CommentPayload) {
    if (payload.comment.isInternal) return;

    if (payload.authorEmail !== payload.requesterEmail && payload.requesterEmail) {
      await this.mailService.sendEmail({
        to: payload.requesterEmail,
        subject: `[Aponta] Nova resposta no chamado ${payload.ticket.protocol}`,
        text: `Olá!\n\nHá um novo comentário no seu chamado "${payload.ticket.title}".\n\nConfira:\n${this.appUrl}/tickets/${payload.ticket.id}`,
      });
    }

    if (payload.agentEmail && payload.authorEmail === payload.requesterEmail) {
      await this.mailService.sendEmail({
        to: payload.agentEmail,
        subject: `[Aponta] Nova interação do cliente no chamado ${payload.ticket.protocol}`,
        text: `Olá!\n\nO cliente enviou uma resposta no chamado "${payload.ticket.title}".\n\nVerifique as atualizações no painel:\n${this.appUrl}/tickets/${payload.ticket.id}`,
      });
    }
  }
}
