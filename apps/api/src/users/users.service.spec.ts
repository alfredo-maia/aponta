import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    const dto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'plain-password',
    };

    it('throws ConflictException when the pre-check finds an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition unique-constraint violation into a clean 409', async () => {
      // Pre-check passes (no existing user found)...
      prisma.user.findUnique.mockResolvedValue(null);
      // ...but a concurrent request wins the race and the DB unique
      // constraint fires on the actual insert.
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '7.8.0' },
      );
      prisma.user.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('re-throws unrelated database errors unchanged', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const unrelatedError = new Error('connection lost');
      prisma.user.create.mockRejectedValue(unrelatedError);

      await expect(service.create(dto)).rejects.toThrow('connection lost');
    });

    it('creates the user and strips the password when everything succeeds', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: dto.name,
        email: dto.email,
        password: 'hashed',
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({ ...dto, role: Role.CLIENT });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(dto.email);
    });
  });
});
