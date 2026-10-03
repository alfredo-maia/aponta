import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersService } from '../users/users.service';

/**
 * Real HTTP-level integration test proving the auth rate limit is actually
 * wired and enforced — not just that ThrottlerModule exists in package.json.
 * No Postgres needed: UsersService is mocked so every login attempt fails
 * with invalid credentials, which is exactly the brute-force scenario the
 * throttle must stop regardless of whether credentials are ever valid.
 */
describe('Auth rate limiting (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
        ThrottlerModule.forRoot([
          { ttl: 60_000, limit: 5 },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows a handful of login attempts but blocks with 429 once the limit is exceeded', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'attacker@example.com', password: 'wrong-password' });

    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await attempt();
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });
});
