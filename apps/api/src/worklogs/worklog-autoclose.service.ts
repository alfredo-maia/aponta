import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';

/** DMTE-462 T4: stub neutro (sem o comportamento), substituído na implementação. */
@Injectable()
export class WorklogAutoCloseService {
  constructor(
    readonly prisma: PrismaService,
    readonly permissions: PermissionsService,
    readonly mail: MailService,
  ) {}

  async run(_now: Date): Promise<number> {
    return 0;
  }
}
