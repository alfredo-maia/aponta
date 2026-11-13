import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

const PANEL_SIZE = 30;

/** DMTE-462 T6: avisos por usuário no sino. Toda leitura e escrita é filtrada pelo id do usuário autenticado. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: PANEL_SIZE }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { unread, items };
  }

  /** A de outro usuário responde 404, como se não existisse. */
  async markRead(id: string, userId: string): Promise<void> {
    const row = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notificação não encontrada');
    if (!row.readAt) await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const { count } = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { count };
  }

  /** Flag desligada não grava; falha só é registrada, para não derrubar o fechamento nem a decisão que avisa. */
  async notify(userIds: string[], notification: NewNotification): Promise<void> {
    if (!this.flags.isEnabled('sino-notificacoes')) return;
    const recipients = [...new Set(userIds)];
    if (recipients.length === 0) return;
    try {
      await this.prisma.notification.createMany({ data: recipients.map((userId) => ({ userId, ...notification })) });
    } catch (cause) {
      this.logger.error(`Falha ao gravar a notificação ${notification.type}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
}
