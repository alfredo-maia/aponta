import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicCsatService } from './public-csat.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  ticket: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('PublicCsatService', () => {
  let service: PublicCsatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicCsatService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PublicCsatService>(PublicCsatService);
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('returns the ticket summary for a valid token', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        csatScore: null,
        csatComment: null,
      });

      const result = await service.getSummary('valid-token');

      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { csatToken: 'valid-token' },
      });
      expect(result).toEqual({
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        score: null,
        comment: null,
      });
    });

    it('throws NotFoundException when the token does not match any ticket', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.getSummary('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rate', () => {
    it('persists score+comment for a valid token', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        protocol: '2026-0001',
        title: 'Impressora não funciona',
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 'ticket-1',
        csatScore: 5,
        csatComment: 'Excelente!',
      });

      const result = await service.rate('valid-token', {
        score: 5,
        comment: 'Excelente!',
      });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { csatToken: 'valid-token' },
        data: { csatScore: 5, csatComment: 'Excelente!' },
      });
      expect(result.csatScore).toBe(5);
    });

    it('throws NotFoundException when the token does not match any ticket', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.rate('bad-token', { score: 5 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });
  });
});
