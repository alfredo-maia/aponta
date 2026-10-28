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
import { KnowledgeAttachmentsController } from './knowledge-attachments.controller';
import { KnowledgeAttachmentsService } from './knowledge-attachments.service';
import { ArticlesService } from '../articles/articles.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ApiTokenStrategy } from '../auth/api-token.strategy';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

/**
 * Real HTTP-level integration test proving the multer pipeline on
 * KnowledgeAttachmentsController actually enforces the 25MB size limit
 * and the MIME allowlist — not just that `limits`/`fileFilter` options
 * are present in source. Same principle as
 * auth/auth-rate-limit.integration.spec.ts for the throttler: a unit test
 * mocking multer would prove nothing about whether the real multer
 * pipeline rejects an oversized/disallowed upload, so this drives actual
 * multipart requests through a real Nest app with the real
 * FileInterceptor/diskStorage/fileFilter wired up. Only PrismaService,
 * UsersService and the two injected services are mocked — no Postgres.
 */
describe('KnowledgeAttachmentsController multer pipeline (real HTTP)', () => {
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

  const articlesService = {
    findById: jest.fn().mockResolvedValue({ id: 'article-1' }),
  };

  const knowledgeAttachmentsService = {
    create: jest.fn().mockImplementation((input: any) => Promise.resolve({ id: 'att-1', ...input })),
    remove: jest.fn().mockResolvedValue({ success: true }),
  };

  function signFor(user: { id: string; email: string }) {
    return jwt.sign({ sub: user.id, email: user.email });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    // Real multer diskStorage writes accepted uploads to ./uploads for
    // real during this suite. Record whether the directory already
    // existed so afterAll only removes what this suite actually created
    // (it doesn't pre-exist anywhere in this repo today).
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
      controllers: [KnowledgeAttachmentsController],
      providers: [
        JwtStrategy,
        ApiTokenStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ArticlesService, useValue: articlesService },
        { provide: KnowledgeAttachmentsService, useValue: knowledgeAttachmentsService },
        { provide: PrismaService, useValue: { apiToken: { findFirst: jest.fn().mockResolvedValue(null) } } },
        // This suite proves multer behavior, not RBAC — give the AGENT
        // caller MANAGE_KNOWLEDGE_BASE unconditionally so uploads/removals
        // reach the handler under test instead of being 403'd upstream.
        { provide: PermissionsService, useValue: { hasPermission: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();

    // Clean up whatever this suite actually wrote via the real multer
    // pipeline (including a file accepted by multer but orphaned by a
    // 404 thrown afterward in the handler body) so the working tree
    // doesn't pick up stray binaries.
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
    knowledgeAttachmentsService.create.mockImplementation((input: any) =>
      Promise.resolve({ id: 'att-1', ...input }),
    );
    articlesService.findById.mockResolvedValue({ id: 'article-1' });
  });

  it('accepts a small, allowed file and persists it through the real multer pipeline', async () => {
    const res = await request(app.getHttpServer())
      .post('/articles/article-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('plain text content'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(knowledgeAttachmentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 'article-1',
        uploaderId: 'agent-1',
        originalName: 'notes.txt',
        mimeType: 'text/plain',
      }),
    );
  });

  it('pins the on-disk extension to the validated MIME type, never to a spoofed originalname (regression: stored-XSS via mismatched extension)', async () => {
    // An attacker claiming `text/plain` (an allowed MIME) while naming the
    // file `evil.html` must never get an `.html` file written to disk —
    // Express's static file server infers Content-Type from the file's
    // on-disk extension, not from what was validated at upload time, so a
    // mismatched extension would let this "attachment" execute as HTML/JS
    // for anyone who opens its link.
    const res = await request(app.getHttpServer())
      .post('/articles/article-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('<script>alert(document.cookie)</script>'), {
        filename: 'evil.html',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    const createCall = knowledgeAttachmentsService.create.mock.calls[0][0];
    expect(createCall.originalName).toBe('evil.html');
    expect(createCall.filename).toMatch(/\.txt$/);
    expect(createCall.fileUrl).toMatch(/\.txt$/);
  });

  it('rejects a file over 25MB with a 413-class error before it reaches the service', async () => {
    const oversized = Buffer.alloc(25 * 1024 * 1024 + 1, 'a');

    const res = await request(app.getHttpServer())
      .post('/articles/article-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', oversized, { filename: 'big.txt', contentType: 'text/plain' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(knowledgeAttachmentsService.create).not.toHaveBeenCalled();
  });

  it('rejects a disallowed MIME type with 400 before it reaches the service', async () => {
    const res = await request(app.getHttpServer())
      .post('/articles/article-1/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(res.status).toBe(400);
    expect(knowledgeAttachmentsService.create).not.toHaveBeenCalled();
  });

  it('rejects an anonymous upload with 403 (RBAC still enforced ahead of the file pipeline)', async () => {
    const res = await request(app.getHttpServer())
      .post('/articles/article-1/attachments')
      .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(403);
    expect(knowledgeAttachmentsService.create).not.toHaveBeenCalled();
  });

  it('404s when the parent article does not exist', async () => {
    articlesService.findById.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/articles/missing-article/attachments')
      .set('Authorization', `Bearer ${signFor(agentUser)}`)
      .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(404);
    expect(knowledgeAttachmentsService.create).not.toHaveBeenCalled();
  });

  it('allows a DELETE from an AGENT with a valid JWT', async () => {
    const res = await request(app.getHttpServer())
      .delete('/articles/article-1/attachments/att-1')
      .set('Authorization', `Bearer ${signFor(agentUser)}`);

    expect(res.status).toBe(200);
    expect(knowledgeAttachmentsService.remove).toHaveBeenCalledWith(
      'att-1',
      expect.objectContaining({ id: 'agent-1' }),
    );
  });

  it('rejects an anonymous DELETE with 403', async () => {
    const res = await request(app.getHttpServer()).delete(
      '/articles/article-1/attachments/att-1',
    );

    expect(res.status).toBe(403);
    expect(knowledgeAttachmentsService.remove).not.toHaveBeenCalled();
  });
});
