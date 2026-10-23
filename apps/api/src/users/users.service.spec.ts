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
      findMany: jest.Mock;
    };
    serviceDesk: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      serviceDesk: {
        findMany: jest.fn(),
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

  describe('updateProfile', () => {
    const existingUser = {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashed',
      role: Role.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates name and email and returns the safe user', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue({
        ...existingUser,
        name: 'Jane Updated',
        email: 'jane.updated@example.com',
      });

      const result = await service.updateProfile('user-1', {
        name: 'Jane Updated',
        email: 'jane.updated@example.com',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Jane Updated', email: 'jane.updated@example.com' },
      });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('jane.updated@example.com');
    });

    it('throws ConflictException when the new email is already in use by another user', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '7.8.0' },
      );
      prisma.user.update.mockRejectedValue(prismaError);

      await expect(
        service.updateProfile('user-1', {
          name: 'Jane Doe',
          email: 'taken@example.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAgents', () => {
    it('ADMIN sees every agent/agent_master/admin with no desk scoping (D8/T4)', async () => {
      const mockUsers = [
        { id: '1', email: 'agent@example.com', password: 'hash', createdAt: new Date(), updatedAt: new Date(), role: Role.AGENT, name: 'Agent' },
        { id: '2', email: 'admin@example.com', password: 'hash', createdAt: new Date(), updatedAt: new Date(), role: Role.ADMIN, name: 'Admin' },
      ];
      prisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const result = await service.findAgents({ id: 'admin-1', role: Role.ADMIN });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: { in: ['AGENT', 'AGENT_MASTER', 'ADMIN'] } },
        orderBy: { name: 'asc' },
      });
      expect(prisma.serviceDesk.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].name).toBe('Agent');
      expect(result[1].name).toBe('Admin');
    });

    it('AGENT/AGENT_MASTER only see agents of the service desks they can access (D8/T4 — Atendente lista agentes dessas mesas)', async () => {
      prisma.serviceDesk.findMany.mockResolvedValueOnce([
        {
          agents: [{ id: 'agent-1' }],
          agentGroups: [{ members: [{ id: 'agent-2' }] }],
        },
      ]);
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 'agent-1', email: 'a1@example.com', password: 'hash', createdAt: new Date(), updatedAt: new Date(), role: Role.AGENT, name: 'Agent 1' },
      ]);

      await service.findAgents({ id: 'agent-1', role: Role.AGENT });

      expect(prisma.serviceDesk.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { agents: { some: { id: 'agent-1' } } },
            { agentGroups: { some: { members: { some: { id: 'agent-1' } } } } },
            { allowCrossDeskInteraction: true, active: true },
          ],
        },
        select: {
          agents: { select: { id: true } },
          agentGroups: { select: { members: { select: { id: true } } } },
        },
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: ['AGENT', 'AGENT_MASTER', 'ADMIN'] },
          id: { in: ['agent-1', 'agent-2'] },
        },
        orderBy: { name: 'asc' },
      });
    });
  });
});
