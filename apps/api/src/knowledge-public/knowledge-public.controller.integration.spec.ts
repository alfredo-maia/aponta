import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PublicKnowledgeController } from './knowledge-public.controller';
import { PublicKnowledgeService } from './knowledge-public.service';

/**
 * Real HTTP-level integration test, same principle as
 * auth/auth-rate-limit.integration.spec.ts and
 * knowledge-folders/knowledge-folders.rbac.integration.spec.ts: proves the
 * ACTUAL request pipeline (ValidationPipe + ThrottlerGuard), not just that
 * decorators are present in source. PublicKnowledgeService is mocked —
 * this suite is about the HTTP contract, not Prisma — and no auth
 * guard/strategy is wired at all, because this controller never has one
 * (D-02): a JWT in the header is simply never read.
 */
describe('PublicKnowledgeController (real HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const publicKnowledgeService = {
    findAllFolders: jest.fn().mockResolvedValue([]),
    findAllArticles: jest.fn().mockResolvedValue([]),
    findOneArticle: jest.fn(),
  };

  function adminJwt() {
    return jwt.sign({ sub: 'admin-1', email: 'admin@dmtecnologia.com' });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
        ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] }),
      ],
      controllers: [PublicKnowledgeController],
      providers: [
        { provide: PublicKnowledgeService, useValue: publicKnowledgeService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC-03: query injection', () => {
    it('rejects an unknown query param (e.g. visibility=PRIVATE) with 400, before it reaches the service', async () => {
      const res = await request(app.getHttpServer()).get(
        '/public/knowledge/articles?visibility=PRIVATE',
      );

      expect(res.status).toBe(400);
      expect(publicKnowledgeService.findAllArticles).not.toHaveBeenCalled();
    });

    it('rejects an isPublic/where override attempt the same way', async () => {
      const res = await request(app.getHttpServer()).get(
        '/public/knowledge/articles?isPublic=true&where=1',
      );

      expect(res.status).toBe(400);
      expect(publicKnowledgeService.findAllArticles).not.toHaveBeenCalled();
    });

    it('still accepts the one whitelisted filter, folderId', async () => {
      const res = await request(app.getHttpServer()).get(
        '/public/knowledge/articles?folderId=f-1',
      );

      expect(res.status).toBe(200);
      expect(publicKnowledgeService.findAllArticles).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: 'f-1' }),
      );
    });
  });

  describe('AC-02: uniform 404, credentials ignored', () => {
    it('returns the identical 404 for a nonexistent article whether or not an ADMIN JWT is presented', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      publicKnowledgeService.findOneArticle.mockRejectedValue(
        new NotFoundException('Article with ID missing not found'),
      );

      const anonRes = await request(app.getHttpServer()).get(
        '/public/knowledge/articles/missing',
      );
      const adminRes = await request(app.getHttpServer())
        .get('/public/knowledge/articles/missing')
        .set('Authorization', `Bearer ${adminJwt()}`);

      expect(anonRes.status).toBe(404);
      expect(adminRes.status).toBe(404);
      expect(anonRes.body).toEqual(adminRes.body);
    });

    it('returns 200 for a PUBLIC article regardless of an unrelated Authorization header', async () => {
      publicKnowledgeService.findOneArticle.mockResolvedValue({ id: 'pub-1', title: 'ok' });

      const res = await request(app.getHttpServer())
        .get('/public/knowledge/articles/pub-1')
        .set('Authorization', `Bearer ${adminJwt()}`);

      expect(res.status).toBe(200);
      // Confirms the controller never even inspects req.user: it's called
      // with just the :id param either way.
      expect(publicKnowledgeService.findOneArticle).toHaveBeenCalledWith('pub-1');
    });
  });

  describe('AC-09: throttle is actually enforced, not just declared', () => {
    it('blocks with 429 once the handler-level @Throttle limit (60/min) is exceeded', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 61; i++) {
        const res = await request(app.getHttpServer()).get('/public/knowledge/folders');
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true);
      expect(statuses[60]).toBe(429);
    }, 20_000);
  });
});
