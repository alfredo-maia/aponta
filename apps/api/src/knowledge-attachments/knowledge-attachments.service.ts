import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import {
  getPrivateKnowledgeUploadsDir,
  isSafeStoredFilename,
} from './private-uploads';

interface CreateKnowledgeAttachmentInput {
  articleId: string;
  uploaderId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileUrl: string;
}

/**
 * Mirrors tickets/attachments.service.ts, adapted for Article instead of
 * Ticket. Unlike the ticket version, `remove` has no owner-vs-privileged
 * split: KnowledgeAttachmentsController only ever lets a caller holding
 * MANAGE_KNOWLEDGE_BASE reach these routes (PermissionsGuard, see the
 * controller), so by the time a request gets here the caller is already a
 * privileged knowledge base editor, not necessarily the original uploader -
 * an AGENT_MASTER cleaning up a colleague's stale attachment is a normal,
 * allowed case, not a permission edge case to special-case. See
 * knowledge-attachments.service.spec.ts for the test covering exactly
 * this: an AGENT who did not upload the file is still allowed to remove
 * it, because the guard already decided who gets this far.
 */
@Injectable()
export class KnowledgeAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateKnowledgeAttachmentInput) {
    return this.prisma.knowledgeAttachment.create({ data: input });
  }

  async remove(attachmentId: string, _user: CurrentUserPayload) {
    const attachment = await this.prisma.knowledgeAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    await this.prisma.knowledgeAttachment.delete({ where: { id: attachmentId } });

    try {
      await unlink(join(getPrivateKnowledgeUploadsDir(), attachment.filename));
    } catch {
      // file might already be gone from disk; ignore
    }

    return { success: true };
  }

  /**
   * Looked up by the download route (D-09/S4.0) after ArticlesService
   * already confirmed the caller can see the parent article. Scoping by
   * both attachmentId AND articleId, plus rejecting an unsafe stored
   * filename (AC-18, defense in depth), keeps the same uniform 404 whether
   * the attachment doesn't exist, belongs to a different article, or (in
   * theory) has a corrupted path — never leaking which case it was.
   */
  async findForDownload(attachmentId: string, articleId: string) {
    const attachment = await this.prisma.knowledgeAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (
      !attachment ||
      attachment.articleId !== articleId ||
      !isSafeStoredFilename(attachment.filename)
    ) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return attachment;
  }
}
