import { Test, TestingModule } from '@nestjs/testing';
import { MailInboundListener } from './mail-inbound.listener';
import { CommentsService } from '../comments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('MailInboundListener', () => {
  let listener: MailInboundListener;
  let commentsService: jest.Mocked<CommentsService>;
  let prismaService: PrismaService;

  beforeEach(async () => {
    commentsService = {
      create: jest.fn(),
    } as any;

    const mockPrisma = {
      ticket: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailInboundListener,
        { provide: CommentsService, useValue: commentsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    listener = module.get<MailInboundListener>(MailInboundListener);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should ignore emails without ticket protocol', async () => {
    await listener.handleInboundEmail({
      subject: 'Hello without ticket protocol',
      textBody: 'hello',
      fromAddress: 'user@test.com',
    });
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should create comment if protocol, ticket, and user match', async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'usr1',
      role: Role.CLIENT,
      email: 'user@test.com',
      organizationId: null,
    });

    (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 'tkt1',
      protocol: 'AP-2026-0000001',
    });

    await listener.handleInboundEmail({
      subject: 'Re: [Aponta] Nova resposta no chamado AP-2026-0000001',
      textBody: 'Este é meu email reply',
      fromAddress: 'user@test.com',
    });

    expect(prismaService.ticket.findUnique).toHaveBeenCalledWith({
      where: { protocol: 'AP-2026-0000001' },
    });

    expect(commentsService.create).toHaveBeenCalledWith(
      'tkt1',
      { content: 'Este é meu email reply', isInternal: false },
      { id: 'usr1', role: Role.CLIENT, email: 'user@test.com', organizationId: null }
    );
  });
  
  it('should trim reply signatures from the email', async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'usr1',
      role: Role.CLIENT,
      email: 'user@test.com',
      organizationId: null,
    });

    (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 'tkt1',
      protocol: 'AP-2026-0000001',
    });

    await listener.handleInboundEmail({
      subject: 'Re: [Aponta] Nova resposta no chamado AP-2026-0000001',
      textBody: 'Este é o novo comentário\n\nOn Sun, 4 Oct 2026 at 10:00, suporte@aponta.com escreveu:\n> Isto é texto antigo.',
      fromAddress: 'user@test.com',
    });

    expect(commentsService.create).toHaveBeenCalledWith(
      'tkt1',
      { content: 'Este é o novo comentário', isInternal: false },
      expect.any(Object)
    );
  });
});
