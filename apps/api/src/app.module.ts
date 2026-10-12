import { CatalogModule } from "./catalog/catalog.module";
import { ChecklistsModule } from "./checklists/checklists.module";
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServiceDesksModule } from './service-desks/service-desks.module';
import { ReportsModule } from './reports/reports.module';
import { ContractsModule } from './contracts/contracts.module';
import { VaultModule } from './vault/vault.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ArticlesModule } from './articles/articles.module';
import { SchedulingModule } from "./scheduling/scheduling.module";
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { HealthModule } from './health/health.module';
import { WorklogsModule } from './worklogs/worklogs.module';
import { AgendaModule } from './agenda/agenda.module';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    CatalogModule,
    ChecklistsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    // Structured JSON logging (issue #42): pino everywhere (replaces Nest's
    // default console logger, wired in main.ts via app.useLogger). In
    // production (NODE_ENV=production) logs are raw JSON lines, ready for
    // ingestion by any log aggregator; in dev they're pretty-printed. The
    // /api/health endpoint is excluded from per-request access logs since
    // uptime monitors poll it every few seconds and would otherwise flood
    // the log stream with noise. Request/response headers that commonly
    // carry secrets (authorization, cookies, API tokens) are redacted.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] || 'info',
        transport:
          process.env['NODE_ENV'] === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-token"]',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        autoLogging: {
          ignore: (req) => req.url === '/api/health',
        },
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Global rate limiting (anti brute-force). A tighter, named limit is
    // applied on top of this for /auth/login via @Throttle on the handler.
    //
    // skipIf disables throttling ONLY when E2E_TESTING=true, which is set
    // exclusively by the CI "E2E (Playwright, full stack)" job (see
    // .github/workflows/ci.yml) to let dozens of register/login flows run
    // in a few minutes without tripping the brute-force limit. It is never
    // set by the production deploy workflow, so prod stays protected.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      skipIf: () => process.env['E2E_TESTING'] === 'true',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ServiceDesksModule,
    TicketsModule, VaultModule, ContractsModule, ReportsModule,
    CommentsModule,
    MailModule,
    OrganizationsModule,
    ArticlesModule,
    SchedulingModule,
    ApiTokensModule,
    HealthModule,
    WorklogsModule,
    AgendaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
