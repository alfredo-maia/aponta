import { NotFoundException } from '@nestjs/common';
import { KnowledgeCatalogService } from './knowledge-catalog.service';

describe('KnowledgeCatalogService', () => {
  let service: KnowledgeCatalogService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      knowledgeCatalogItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new KnowledgeCatalogService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('uses a plain findMany ordered by name when there is no search term', async () => {
      await service.findAll();

      expect(mockPrisma.knowledgeCatalogItem.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('runs the fuzzy/ILIKE raw query with the search term for an exact match (e.g. "Treinamento")', async () => {
      await service.findAll({ search: 'Treinamento' });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [sqlFragments, ...values] = mockPrisma.$queryRaw.mock.calls[0];
      // Tagged-template call: first arg is the array of raw SQL fragments,
      // the rest are the interpolated parameters (the search term, once per
      // placeholder used in the query).
      expect(Array.isArray(sqlFragments)).toBe(true);
      expect(sqlFragments.join('')).toContain('KnowledgeCatalogItem');
      expect(sqlFragments.join('')).toContain('ILIKE');
      expect(sqlFragments.join('')).toContain('similarity');
      expect(values.every((v: unknown) => v === 'Treinamento')).toBe(true);
      expect(mockPrisma.knowledgeCatalogItem.findMany).not.toHaveBeenCalled();
    });

    it('runs the same fuzzy/ILIKE raw query for a partial term', async () => {
      await service.findAll({ search: 'trein' });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [, ...values] = mockPrisma.$queryRaw.mock.calls[0];
      expect(values.every((v: unknown) => v === 'trein')).toBe(true);
    });

    it(
      'runs the same fuzzy/ILIKE raw query for a misspelled term (e.g. "trienamento" -> "Treinamento"); ' +
        'real typo-tolerance is only verifiable against a live Postgres (pg_trgm similarity), not in this ' +
        'mocked unit test — see the CI e2e job',
      async () => {
        await service.findAll({ search: 'trienamento' });

        expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
        const [, ...values] = mockPrisma.$queryRaw.mock.calls[0];
        expect(values.every((v: unknown) => v === 'trienamento')).toBe(true);
      },
    );
  });

  describe('findOne', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the item when it exists', async () => {
      const item = { id: 'item-1', name: 'Treinamento', description: null };
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue(item);

      const result = await service.findOne('item-1');

      expect(result).toEqual(item);
    });
  });

  describe('create', () => {
    it('creates the item via the Prisma client (no raw SQL)', async () => {
      const dto = { name: 'Treinamento', description: 'Agendamento de treinamentos' };
      mockPrisma.knowledgeCatalogItem.create.mockResolvedValue({ id: 'item-1', ...dto });

      const result = await service.create(dto as any);

      expect(mockPrisma.knowledgeCatalogItem.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'item-1', ...dto });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.knowledgeCatalogItem.update).not.toHaveBeenCalled();
    });

    it('updates the item when it exists', async () => {
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.knowledgeCatalogItem.update.mockResolvedValue({ id: 'item-1', name: 'Novo nome' });

      const result = await service.update('item-1', { name: 'Novo nome' } as any);

      expect(mockPrisma.knowledgeCatalogItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'Novo nome' },
      });
      expect(result).toEqual({ id: 'item-1', name: 'Novo nome' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.knowledgeCatalogItem.delete).not.toHaveBeenCalled();
    });

    it('deletes the item when it exists', async () => {
      mockPrisma.knowledgeCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.knowledgeCatalogItem.delete.mockResolvedValue({ id: 'item-1' });

      const result = await service.remove('item-1');

      expect(mockPrisma.knowledgeCatalogItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(result).toEqual({ id: 'item-1' });
    });
  });
});
