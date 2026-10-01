import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from './decorators/current-user.decorator';

interface CreateAttachmentInput {
  ticketId: string;
  uploaderId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileUrl: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAttachmentInput) {
    return this.prisma.ticketAttachment.create({ data: input });
  }

  findAllByTicket(ticketId: string) {
    return this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(attachmentId: string, user: CurrentUserPayload) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }
    const isOwner = attachment.uploaderId === user.id;
    const isPrivileged = (
      [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT] as Role[]
    ).includes(user.role);
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException(
        'Você não tem permissão para remover este anexo',
      );
    }

    await this.prisma.ticketAttachment.delete({ where: { id: attachmentId } });

    try {
      await unlink(join(process.cwd(), 'uploads', attachment.filename));
    } catch {
      // file might already be gone from disk; ignore
    }

    return { success: true };
  }
}
