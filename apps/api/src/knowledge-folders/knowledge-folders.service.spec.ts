import { NotFoundException } from '@nestjs/common';
import { KnowledgeFoldersService } from './knowledge-folders.service';

describe('KnowledgeFoldersService', () => {
  let service: KnowledgeFoldersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      knowledgeFolder: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      article: {
        deleteMany: jest.fn(),
      },
    };
    service = new KnowledgeFoldersService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('lists folders ordered by name ascending, with an article count', async () => {
      await service.findAll();

      expect(mockPrisma.knowledgeFolder.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: { _count: { select: { articles: true } } },
      });
    });
  });

  describe('create', () => {
    it('creates a folder with the given name/description/icon', async () => {
      mockPrisma.knowledgeFolder.create.mockResolvedValue({ id: 'f-1' });

      await service.create({ name: 'Financeiro', description: 'Notas fiscais', icon: '📁' });

      expect(mockPrisma.knowledgeFolder.create).toHaveBeenCalledWith({
        data: { name: 'Financeiro', description: 'Notas fiscais', icon: '📁' },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException if the folder does not exist', async () => {
      mockPrisma.knowledgeFolder.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Novo nome' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates an existing folder', async () => {
      mockPrisma.knowledgeFolder.findUnique.mockResolvedValue({ id: 'f-1' });
      mockPrisma.knowledgeFolder.update.mockResolvedValue({ id: 'f-1', name: 'Novo nome' });

      await service.update('f-1', { name: 'Novo nome' });

      expect(mockPrisma.knowledgeFolder.update).toHaveBeenCalledWith({
        where: { id: 'f-1' },
        data: { name: 'Novo nome' },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException if the folder does not exist', async () => {
      mockPrisma.knowledgeFolder.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('removes the folder without touching its articles (ON DELETE SET NULL handles orphaning)', async () => {
      mockPrisma.knowledgeFolder.findUnique.mockResolvedValue({ id: 'f-1' });
      mockPrisma.knowledgeFolder.delete.mockResolvedValue({ id: 'f-1' });

      await service.remove('f-1');

      expect(mockPrisma.knowledgeFolder.delete).toHaveBeenCalledWith({ where: { id: 'f-1' } });
      expect(mockPrisma.article.deleteMany).not.toHaveBeenCalled();
    });
  });
});
