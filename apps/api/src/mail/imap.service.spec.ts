import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImapService } from './imap.service';

const mockClient = {
  connect: jest.fn(),
  logout: jest.fn(),
  getMailboxLock: jest.fn(),
  fetch: jest.fn(),
  messageFlagsAdd: jest.fn(),
};

jest.mock('imapflow', () => ({
  ImapFlow: jest.fn().mockImplementation(() => mockClient),
}));

jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

import { simpleParser } from 'mailparser';

describe('ImapService', () => {
  let service: ImapService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImapService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'IMAP_HOST') return 'imap.test.com';
              if (key === 'IMAP_USER') return 'user@test.com';
              if (key === 'IMAP_PASS') return 'pass';
              if (key === 'IMAP_PORT') return 993;
              if (key === 'IMAP_ENABLED') return 'true';
              return null;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ImapService>(ImapService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should fetch unseen emails and emit event', async () => {
    const mockLock = { release: jest.fn() };
    mockClient.getMailboxLock.mockResolvedValue(mockLock);

    // Mock async iterator for fetch
    mockClient.fetch.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { seq: 1, source: Buffer.from('Email body') };
      },
    });

    (simpleParser as jest.Mock).mockResolvedValue({
      subject: 'Re: [Aponta] Nova resposta no chamado TKT-123',
      text: 'Test reply body\n> wrote:\n',
      from: { value: [{ address: 'test@client.com' }] },
    });

    await service.processUnreadEmails();

    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.getMailboxLock).toHaveBeenCalledWith('INBOX');
    expect(simpleParser).toHaveBeenCalledWith(Buffer.from('Email body'));
    expect(eventEmitter.emit).toHaveBeenCalledWith('mail.inbound.received', {
      subject: 'Re: [Aponta] Nova resposta no chamado TKT-123',
      textBody: 'Test reply body\n> wrote:\n',
      fromAddress: 'test@client.com',
    });
    expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(1, ['\\Seen'], { uid: false });
    expect(mockLock.release).toHaveBeenCalled();
    expect(mockClient.logout).toHaveBeenCalled();
  });
});
