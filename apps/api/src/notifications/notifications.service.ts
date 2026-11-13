import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

export interface NewNotification {
  type: NotificationType;
  title: string;
  body: string;
  /** Caminho interno do app, escolhido pelo servidor. */
  link: string;
}

/** DMTE-462 T6: stub neutro (sem o comportamento), substituído na implementação. */
@Injectable()
export class NotificationsService {
  constructor(
    readonly prisma: PrismaService,
    readonly flags: FeatureFlagsService,
  ) {}

  async list(_userId: string): Promise<{ unread: number; items: unknown[] }> {
    return { unread: 0, items: [] };
  }

  async markRead(_id: string, _userId: string): Promise<void> {
    return undefined;
  }

  async markAllRead(_userId: string): Promise<{ count: number }> {
    return { count: 0 };
  }

  async notify(_userIds: string[], _notification: NewNotification): Promise<void> {
    return undefined;
  }
}
