import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { KnowledgeAttachmentsService } from './knowledge-attachments.service';

jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('KnowledgeAttachmentsService', () => {
  let service: KnowledgeAttachmentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      knowledgeAttachment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new KnowledgeAttachmentsService(mockPrisma as any);
  });

  describe('create', () => {
    it('creates an attachment record with the given input', async () => {
      const input = {
        articleId: 'a-1',
        uploaderId: 'u-1',
        filename: 'uuid.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        fileUrl: '/uploads/uuid.png',
      };
      mockPrisma.knowledgeAttachment.create.mockResolvedValue({ id: 'att-1', ...input });

      const result = await service.create(input);

      expect(mockPrisma.knowledgeAttachment.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual({ id: 'att-1', ...input });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the attachment does not exist', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('missing', { id: 'u-1', role: Role.AGENT }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows an AGENT who is not the original uploader to remove the attachment (guard already restricts callers to privileged roles)', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        filename: 'uuid.png',
        uploaderId: 'someone-else',
      });
      mockPrisma.knowledgeAttachment.delete.mockResolvedValue({ id: 'att-1' });

      const result = await service.remove('att-1', { id: 'agent-1', role: Role.AGENT });

      expect(mockPrisma.knowledgeAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
      expect(result).toEqual({ success: true });
    });

    it('deletes the underlying file from disk and still succeeds if unlink fails', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        filename: 'uuid.png',
        uploaderId: 'agent-1',
      });
      mockPrisma.knowledgeAttachment.delete.mockResolvedValue({ id: 'att-1' });
      const { unlink } = jest.requireMock('fs/promises');
      unlink.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await service.remove('att-1', { id: 'agent-1', role: Role.AGENT });

      expect(result).toEqual({ success: true });
    });

    it('unlinks from the private knowledge uploads dir, never from ./uploads (D-09/S4.0)', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        filename: 'uuid.png',
        uploaderId: 'agent-1',
      });
      mockPrisma.knowledgeAttachment.delete.mockResolvedValue({ id: 'att-1' });
      const { unlink } = jest.requireMock('fs/promises');
      unlink.mockResolvedValueOnce(undefined);

      await service.remove('att-1', { id: 'agent-1', role: Role.AGENT });

      const unlinkedPath = unlink.mock.calls[unlink.mock.calls.length - 1][0] as string;
      expect(unlinkedPath).toContain('uploads-private');
      expect(unlinkedPath).not.toMatch(/(^|\/)uploads\/uuid\.png$/);
    });
  });

  describe('findForDownload (D-09/S4.0)', () => {
    it('throws NotFoundException when the attachment does not exist', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue(null);

      await expect(
        service.findForDownload('missing', 'article-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the attachment belongs to a different article (anti-enumeration)', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        articleId: 'other-article',
        filename: 'uuid.png',
      });

      await expect(
        service.findForDownload('att-1', 'article-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the stored filename is unsafe (AC-18, defense in depth)', async () => {
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        articleId: 'article-1',
        filename: '../../etc/passwd',
      });

      await expect(
        service.findForDownload('att-1', 'article-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the attachment when it exists, belongs to the article and has a safe filename', async () => {
      const attachment = { id: 'att-1', articleId: 'article-1', filename: 'uuid.png' };
      mockPrisma.knowledgeAttachment.findUnique.mockResolvedValue(attachment);

      const result = await service.findForDownload('att-1', 'article-1');

      expect(result).toEqual(attachment);
    });
  });
});
