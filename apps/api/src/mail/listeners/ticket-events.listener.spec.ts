import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TicketEventsListener } from './ticket-events.listener';
import { MailService } from '../mail.service';

const mockMailService = {
  sendEmail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'WEB_ORIGIN') return 'https://aponta.dmtecnologia.cloud';
    return undefined;
  }),
};

describe('TicketEventsListener', () => {
  let listener: TicketEventsListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketEventsListener,
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    listener = module.get<TicketEventsListener>(TicketEventsListener);
    jest.clearAllMocks();
  });

  describe('handleTicketStatusChangedEvent', () => {
    it('sends a CSAT-request email with a public token link when the ticket becomes RESOLVED', async () => {
      const ticket = {
        id: 'ticket-1',
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        status: 'RESOLVED',
        csatToken: 'tok-abc-123',
      };

      await listener.handleTicketStatusChangedEvent({
        ticket,
        requesterEmail: 'cliente@aponta.com',
      });

      expect(mockMailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendEmail).toHaveBeenCalledWith({
        to: 'cliente@aponta.com',
        subject: `[Aponta] Seu chamado ${ticket.protocol} foi resolvido — avalie nosso atendimento`,
        text: expect.stringContaining(
          'https://aponta.dmtecnologia.cloud/avaliar/tok-abc-123',
        ),
      });
      // Must not also send the generic "status changed" email
      expect(mockMailService.sendEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('mudou para'),
        }),
      );
    });

    it('falls back to the ticket detail link when the ticket has no csatToken yet', async () => {
      const ticket = {
        id: 'ticket-1',
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        status: 'RESOLVED',
        csatToken: null,
      };

      await listener.handleTicketStatusChangedEvent({
        ticket,
        requesterEmail: 'cliente@aponta.com',
      });

      expect(mockMailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            'https://aponta.dmtecnologia.cloud/tickets/ticket-1',
          ),
        }),
      );
    });

    it('sends the generic status-changed email for non-RESOLVED statuses', async () => {
      const ticket = {
        id: 'ticket-2',
        protocol: '2026-0002',
        title: 'Acesso ao sistema',
        status: 'IN_PROGRESS',
      };

      await listener.handleTicketStatusChangedEvent({
        ticket,
        requesterEmail: 'cliente@aponta.com',
      });

      expect(mockMailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cliente@aponta.com',
          subject: expect.stringContaining('mudou para'),
        }),
      );
    });

    it('does nothing when there is no requesterEmail', async () => {
      await listener.handleTicketStatusChangedEvent({
        ticket: { id: 't', protocol: 'x', title: 'x', status: 'RESOLVED' },
      });

      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
