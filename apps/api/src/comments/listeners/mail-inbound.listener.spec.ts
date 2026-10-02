import { Test, TestingModule } from '@nestjs/testing';
import { MailInboundListener } from './mail-inbound.listener';
import { CommentsService } from '../comments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { Role } from '@prisma/client';

describe('MailInboundListener', () => {
  let listener: MailInboundListener;
  let commentsService: jest.Mocked<CommentsService>;
  let prismaService: PrismaService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    commentsService = {
      create: jest.fn(),
    } as any;

    const mockPrisma = {
      ticket: {
        findUnique: jest.fn(),
      },
    };

    usersService = {
      findByEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailInboundListener,
        { provide: CommentsService, useValue: commentsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: usersService },
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
    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });

  it('should create comment if protocol, ticket, and user match', async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'usr1',
      role: Role.CLIENT,
      email: 'user@test.com',
      organizationId: null,
    });

    (prismaService.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 'tkt1',
      protocol: 'TKT-123',
    });

    await listener.handleInboundEmail({
      subject: 'Re: [Aponta] Nova resposta no chamado TKT-123',
      textBody: 'Este é meu email reply',
      fromAddress: 'user@test.com',
    });

    expect(prismaService.ticket.findUnique).toHaveBeenCalledWith({
      where: { protocol: 'TKT-123' },
    });

    expect(commentsService.create).toHaveBeenCalledWith(
      'tkt1',
      { content: 'Este é meu email reply', isInternal: false },
      { id: 'usr1', role: Role.CLIENT, email: 'user@test.com', organizationId: null }
    );
  });
});
