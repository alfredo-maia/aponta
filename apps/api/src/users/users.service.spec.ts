import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { UsersService, PaginatedUsers, UserWithGroups } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PERMISSION_GROUPS,
  ROLE_GROUP_NAME,
} from '../permission-groups/default-permission-groups';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    permissionGroup: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    permissionGroupUser: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      permissionGroup: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      permissionGroupUser: {
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
      prisma.permissionGroup.findFirst.mockResolvedValue({ id: 'group-client' });

      const result = await service.create({ ...dto, role: Role.CLIENT });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(dto.email);
    });

    // DMTE-133: retrabalho apontado pelo E2E real da Tarefa 3 — sem este
    // vínculo, PermissionsService.getEffectivePermissions não encontra
    // nenhum PermissionGroup para o usuário novo e ele nasce sem nenhuma
    // permissão (ADMIN tem bypass no guard, os demais papéis não).
    it('links the newly created user to the existing default PermissionGroup for their role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: dto.name,
        email: dto.email,
        password: 'hashed',
        role: Role.AGENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.permissionGroup.findFirst.mockResolvedValue({
        id: 'group-agent',
        name: ROLE_GROUP_NAME[Role.AGENT],
      });

      await service.create({ ...dto, role: Role.AGENT });

      expect(prisma.permissionGroup.findFirst).toHaveBeenCalledWith({
        where: { name: ROLE_GROUP_NAME[Role.AGENT] },
      });
      expect(prisma.permissionGroup.create).not.toHaveBeenCalled();
      expect(prisma.permissionGroupUser.create).toHaveBeenCalledWith({
        data: { permissionGroupId: 'group-agent', userId: 'user-1' },
      });
    });

    it("creates the role's default PermissionGroup when it does not exist yet, then links the user to it", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: dto.name,
        email: dto.email,
        password: 'hashed',
        role: Role.AGENT_MASTER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.permissionGroup.findFirst.mockResolvedValue(null);
      prisma.permissionGroup.create.mockResolvedValue({
        id: 'new-group-agent-master',
        name: ROLE_GROUP_NAME[Role.AGENT_MASTER],
      });

      await service.create({ ...dto, role: Role.AGENT_MASTER });

      expect(prisma.permissionGroup.create).toHaveBeenCalledWith({
        data: {
          name: ROLE_GROUP_NAME[Role.AGENT_MASTER],
          description: DEFAULT_PERMISSION_GROUPS[Role.AGENT_MASTER].description,
          permissions: DEFAULT_PERMISSION_GROUPS[Role.AGENT_MASTER].permissions,
        },
      });
      expect(prisma.permissionGroupUser.create).toHaveBeenCalledWith({
        data: {
          permissionGroupId: 'new-group-agent-master',
          userId: 'user-1',
        },
      });
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
    it('returns a list of agents and admins mapped to SafeUsers', async () => {
      const mockUsers = [
        { id: '1', email: 'agent@example.com', password: 'hash', createdAt: new Date(), updatedAt: new Date(), role: Role.AGENT, name: 'Agent' },
        { id: '2', email: 'admin@example.com', password: 'hash', createdAt: new Date(), updatedAt: new Date(), role: Role.ADMIN, name: 'Admin' },
      ];
      prisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const result = await service.findAgents();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: { in: ['AGENT', 'ADMIN'] } },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].name).toBe('Agent');
      expect(result[1].name).toBe('Admin');
    });
  });

  describe('setActive', () => {
    const existingUser = {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashed',
      role: Role.AGENT,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('deactivates a user and returns the safe user', async () => {
      prisma.user.update.mockResolvedValue({ ...existingUser, active: false });

      const result = await service.setActive('user-1', false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { active: false },
        include: { organization: true },
      });
      expect(result).not.toHaveProperty('password');
      expect(result.active).toBe(false);
    });

    it('reactivates a user', async () => {
      prisma.user.update.mockResolvedValue({ ...existingUser, active: true });

      const result = await service.setActive('user-1', true);

      expect(result.active).toBe(true);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        { code: 'P2025', clientVersion: '7.8.0' },
      );
      prisma.user.update.mockRejectedValue(prismaError);

      await expect(service.setActive('missing-user', false)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll with query params', () => {
    it('returns a plain array (backward compatible) when no query params are passed', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'Agent',
          email: 'agent@example.com',
          password: 'hash',
          role: Role.AGENT,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: null,
          technicalGroup: null,
          permissionGroupLinks: [],
        },
      ];
      prisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const result = (await service.findAll({})) as UserWithGroups[];

      expect(Array.isArray(result)).toBe(true);
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).not.toHaveProperty('permissionGroupLinks');
      expect(result[0].permissionGroups).toEqual([]);
    });

    it('returns a paginated envelope when page/pageSize are passed', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'Agent',
          email: 'agent@example.com',
          password: 'hash',
          role: Role.AGENT,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: null,
          technicalGroup: null,
          permissionGroupLinks: [
            { permissionGroup: { id: 'pg-1', name: 'Atendentes' } },
          ],
        },
      ];
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const result = (await service.findAll({
        page: '1',
        pageSize: '20',
      })) as PaginatedUsers;

      expect(result).toEqual({
        data: expect.any(Array),
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });
      expect(result.data[0].permissionGroups).toEqual([
        { id: 'pg-1', name: 'Atendentes' },
      ]);
      expect(result.data[0]).not.toHaveProperty('password');
    });

    it('searches by name or email when q is passed', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findMany.mockResolvedValueOnce([]);

      await service.findAll({ q: 'jane' });

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { name: { contains: 'jane', mode: 'insensitive' } },
        { email: { contains: 'jane', mode: 'insensitive' } },
      ]);
    });

    it('filters by technicalGroupId when passed', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findMany.mockResolvedValueOnce([]);

      await service.findAll({ technicalGroupId: 'tg-1' });

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.technicalGroupId).toBe('tg-1');
    });

    it('filters by permissionGroupId when passed', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findMany.mockResolvedValueOnce([]);

      await service.findAll({ permissionGroupId: 'pg-1' });

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.permissionGroupLinks).toEqual({
        some: { permissionGroupId: 'pg-1' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the user enriched with groups', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashed',
        role: Role.AGENT,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: null,
        technicalGroup: { id: 'tg-1', name: 'Suporte N1' },
        permissionGroupLinks: [
          { permissionGroup: { id: 'pg-1', name: 'Atendentes' } },
        ],
      });

      const result = await service.findOne('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result.technicalGroup).toEqual({ id: 'tg-1', name: 'Suporte N1' });
      expect(result.permissionGroups).toEqual([
        { id: 'pg-1', name: 'Atendentes' },
      ]);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
