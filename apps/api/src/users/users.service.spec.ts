import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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

  describe('changePassword', () => {
    const existingUser = {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: '',
      role: Role.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('throws UnauthorizedException when the current password is wrong', async () => {
      existingUser.password = await bcrypt.hash('correct-current-password', 10);
      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.changePassword(
          existingUser.id,
          'wrong-current-password',
          'brand-new-password',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('missing-user', 'whatever', 'brand-new-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('hashes and persists the new password when the current password is correct', async () => {
      existingUser.password = await bcrypt.hash('correct-current-password', 10);
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue({
        ...existingUser,
        password: 'new-hashed-password',
      });

      await service.changePassword(
        existingUser.id,
        'correct-current-password',
        'brand-new-password',
      );

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateArgs = prisma.user.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: existingUser.id });
      // The new password must be hashed, never stored in plain text.
      expect(updateArgs.data.password).not.toBe('brand-new-password');
      const isNewPasswordHashCorrect = await bcrypt.compare(
        'brand-new-password',
        updateArgs.data.password,
      );
      expect(isNewPasswordHashCorrect).toBe(true);
    });
  });
});
