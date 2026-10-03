import { CatalogModule } from "./catalog/catalog.module";
import { ChecklistsModule } from "./checklists/checklists.module";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    CatalogModule,
    ChecklistsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
