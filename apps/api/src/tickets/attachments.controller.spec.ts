import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { readdir, rm, unlink } from 'fs/promises';
import { join } from 'path';
import { Role } from '@prisma/client';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { TicketsService } from './tickets.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { UsersService } from '../users/users.service';

/**
 * Real HTTP-level integration test for AttachmentsController's multer
 * pipeline — this controller previously had no spec at all. Added
 * alongside the DMTE-89 knowledge-attachments fix (safe-upload-extension.ts)
 * because this controller shared the exact same vulnerable pattern: the
 * on-disk extension used to come from the client-supplied `originalname`,
 * which let an attacker upload e.g. `evil.html` declared as `text/plain`
 * (an allowed MIME) and have Express's static server serve it back as
 * `text/html` — stored XSS via a "harmless-looking" ticket attachment.
 */
describe('AttachmentsController multer pipeline (real HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const uploadsDir = join(process.cwd(), 'uploads');
  let uploadsDirPreexisted = true;

  const agentUser = {
    id: 'agent-1',
    email: 'agent@dmtecnologia.com',
    role: Role.AGENT,
    organizationId: null,
  };

  const usersService = {
    findById: jest.fn((id: string) =>
      Promise.resolve(id === agentUser.id ? agentUser : null),
    ),
  };

  const ticketsService = {
    findOne: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
  };

  const attachmentsService = {
    create: jest.fn().mockImplementation((input: any) => Promise.resolve({ id: 'att-1', ...input })),
  };

  function signFor(user: { id: string; email: string }) {
    return jwt.sign({ sub: user.id, email: user.email });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    try {
      await readdir(uploadsDir);
    } catch {
      uploadsDirPreexisted = false;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        PassportModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
      ],
      controllers: [AttachmentsController],
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: TicketsService, useValue: ticketsService },
        { provide: AttachmentsService, useValue: attachmentsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();

    if (!uploadsDirPreexisted) {
      await rm(uploadsDir, { recursive: true, force: true });
    } else {
      try {
        const leftover = await readdir(uploadsDir);
        await Promise.all(
          leftover.map((f) => unlink(join(uploadsDir, f)).catch(() => undefined)),
        );
      } catch {
        // nothing to clean up
      }
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    attachmentsService.create.mockImplementation((input: any) =>
      Promise.resolve({ id: 'att-1', ...input }),
    );
    ticketsService.findOne.mockResolvedValue({ id: 'ticket-1' });
  });

  it('accepts a small, allowed file and persists it through the real multer pipeline', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/ticket-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('plain text content'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(attachmentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 'ticket-1',
        uploaderId: 'agent-1',
        originalName: 'notes.txt',
        mimeType: 'text/plain',
      }),
    );
  });

  it('pins the on-disk extension to the validated MIME type, never to a spoofed originalname (regression: stored-XSS via mismatched extension)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/ticket-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('<script>alert(document.cookie)</script>'), {
        filename: 'evil.html',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    const createCall = attachmentsService.create.mock.calls[0][0];
    expect(createCall.originalName).toBe('evil.html');
    expect(createCall.filename).toMatch(/\.txt$/);
    expect(createCall.fileUrl).toMatch(/\.txt$/);
  });

  it('rejects a disallowed MIME type with 400 before it reaches the service', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/ticket-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(res.status).toBe(400);
    expect(attachmentsService.create).not.toHaveBeenCalled();
  });

  it('rejects an anonymous upload with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/ticket-1/attachments')
      .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(401);
    expect(attachmentsService.create).not.toHaveBeenCalled();
  });
});
