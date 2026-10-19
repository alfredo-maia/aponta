import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { Role } from '@prisma/client';
import { KnowledgeFoldersController } from './knowledge-folders.controller';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ApiTokenStrategy } from '../auth/api-token.strategy';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Real HTTP-level integration test proving RBAC is actually wired on
 * KnowledgeFoldersController - not just that @Roles() decorators exist.
 *
 * Code review caught a real bug here: the controller originally had no
 * class-level auth guard (unlike every other RBAC-protected controller,
 * e.g. ArticlesController, CommentsController), so request.user was never
 * populated and RolesGuard rejected every caller with 403 - including a
 * legitimate ADMIN holding a valid JWT. OptionalJwtOrTokenAuthGuard was
 * added at the class level to fix it (see knowledge-folders.controller.ts).
 */
describe('KnowledgeFoldersController RBAC (real HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const adminUser = {
    id: 'admin-1',
    email: 'admin@dmtecnologia.com',
    role: Role.ADMIN,
    organizationId: null,
  };
  const clientUser = {
    id: 'client-1',
    email: 'client@dmtecnologia.com',
    role: Role.CLIENT,
    organizationId: null,
  };

  const usersService = {
    findById: jest.fn((id: string) =>
      Promise.resolve([adminUser, clientUser].find((u) => u.id === id) ?? null),
    ),
  };

  const knowledgeFoldersService = {
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'f-1' }),
    update: jest.fn().mockResolvedValue({ id: 'f-1' }),
    remove: jest.fn().mockResolvedValue({ id: 'f-1' }),
  };

  function signFor(user: { id: string; email: string }) {
    return jwt.sign({ sub: user.id, email: user.email });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        PassportModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
      ],
      controllers: [KnowledgeFoldersController],
      providers: [
        JwtStrategy,
        ApiTokenStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: KnowledgeFoldersService, useValue: knowledgeFoldersService },
        { provide: PrismaService, useValue: { apiToken: { findFirst: jest.fn().mockResolvedValue(null) } } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows an anonymous GET (public folder listing)', async () => {
    const res = await request(app.getHttpServer()).get('/knowledge-folders');
    expect(res.status).toBe(200);
  });

  it('rejects an anonymous POST with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/knowledge-folders')
      .send({ name: 'Financeiro' });

    expect(res.status).toBe(403);
    expect(knowledgeFoldersService.create).not.toHaveBeenCalled();
  });

  it('rejects a POST from a CLIENT with a valid JWT with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/knowledge-folders')
      .set('Authorization', `Bearer ${signFor(clientUser)}`)
      .send({ name: 'Financeiro' });

    expect(res.status).toBe(403);
    expect(knowledgeFoldersService.create).not.toHaveBeenCalled();
  });

  it('allows a POST from a real ADMIN with a valid JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/knowledge-folders')
      .set('Authorization', `Bearer ${signFor(adminUser)}`)
      .send({ name: 'Financeiro' });

    expect(res.status).toBe(201);
    expect(knowledgeFoldersService.create).toHaveBeenCalledWith({ name: 'Financeiro' });
  });

  it('allows a DELETE from a real ADMIN with a valid JWT', async () => {
    const res = await request(app.getHttpServer())
      .delete('/knowledge-folders/f-1')
      .set('Authorization', `Bearer ${signFor(adminUser)}`);

    expect(res.status).toBe(200);
    expect(knowledgeFoldersService.remove).toHaveBeenCalledWith('f-1');
  });

  it('rejects a DELETE from a CLIENT with a valid JWT with 403', async () => {
    const res = await request(app.getHttpServer())
      .delete('/knowledge-folders/f-1')
      .set('Authorization', `Bearer ${signFor(clientUser)}`);

    expect(res.status).toBe(403);
    expect(knowledgeFoldersService.remove).not.toHaveBeenCalled();
  });
});
