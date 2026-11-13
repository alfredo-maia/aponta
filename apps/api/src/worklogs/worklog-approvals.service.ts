import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

/** DMTE-462 T5: stub neutro (sem o comportamento), substituído na implementação. */
@Injectable()
export class WorklogApprovalsService {
  constructor(
    readonly prisma: PrismaService,
    readonly permissions: PermissionsService,
    readonly mail: MailService,
  ) {}

  async list(_user: CurrentUserPayload): Promise<unknown[]> {
    return [];
  }

  async approve(_id: string, _user: CurrentUserPayload): Promise<unknown> {
    return undefined;
  }

  async reject(_id: string, _note: string | undefined, _user: CurrentUserPayload): Promise<unknown> {
    return undefined;
  }

  async notifyPending(_worklog: { id: string }): Promise<void> {
    return undefined;
  }
}
