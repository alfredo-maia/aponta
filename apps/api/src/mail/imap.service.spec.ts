/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ImapService } from './imap.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as mailparser from 'mailparser';

jest.mock('imapflow', () => ({
  ImapFlow: jest.fn().mockImplementation(() => mockClient),
}));

jest.mock('mailparser', () => ({
  simpleParser: jest.fn()
}));

let mockClient: any;
let mockLock: any;

describe('ImapService', () => {
  let service: ImapService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    mockLock = { release: jest.fn() };
    mockClient = {
      connect: jest.fn().mockResolvedValue(true),
      getMailboxLock: jest.fn().mockResolvedValue(mockLock),
      messageFlagsAdd: jest.fn().mockResolvedValue(true),
      logout: jest.fn().mockResolvedValue(true),
      fetch: jest.fn(),
      usable: true,
    };

    (mailparser.simpleParser as jest.Mock).mockResolvedValue({
      subject: 'Re: [Aponta] Chamado TKT-12345',
      text: 'My reply text',
      from: { value: [{ address: 'test@client.com' }] },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImapService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'IMAP_ENABLED') return 'true';
              if (key === 'IMAP_HOST') return 'imap.site.com';
              if (key === 'IMAP_PORT') return 993;
              if (key === 'IMAP_USER') return 'user';
              if (key === 'IMAP_PASS') return 'pass';
              return null;
            }),
          },
        },
        {
           provide: EventEmitter2,
           useValue: { emit: jest.fn() }
        }
      ],
    }).compile();

    service = module.get<ImapService>(ImapService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch unseen emails and emit event', async () => {
    const mockMessages = [
      { uid: 1001, source: Buffer.from('mock email') }
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockClient.fetch.mockImplementation(async function* (...args: any[]) {
      for (const msg of mockMessages) yield msg;
    });

    await service.pollInbox();

    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.getMailboxLock).toHaveBeenCalledWith('INBOX');

    expect(eventEmitter.emit).toHaveBeenCalledWith('mail.inbound.received', {
      subject: 'Re: [Aponta] Chamado TKT-12345',
      textBody: 'My reply text',
      fromAddress: 'test@client.com',
    });
    expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith('1001', ['\\Seen'], { uid: true });
    expect(mockLock.release).toHaveBeenCalled();
    expect(mockClient.logout).toHaveBeenCalled();
  });
});
