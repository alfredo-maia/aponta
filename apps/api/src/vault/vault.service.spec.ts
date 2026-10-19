import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { CredentialAction, Role } from '@prisma/client';

describe('VaultService', () => {
  let service: VaultService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      credential: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      credentialFolder: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      credentialAuditLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'org-admin' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Ana Admin' }),
      },
    };
    service = new VaultService(mockPrisma as any);
  });

  const adminUser = { id: 'admin-1', role: Role.ADMIN };
  const agentUser = { id: 'agent-1', role: Role.AGENT };
  const clientUser = { id: 'client-1', role: Role.CLIENT };
  const clientMasterUser = { id: 'cm-1', role: Role.CLIENT_MASTER };

  // -------------------------------------------------------------------
  // Folders
  // -------------------------------------------------------------------
  describe('findFolders', () => {
    it('throws ForbiddenException for CLIENT', async () => {
      await expect(service.findFolders(clientUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for CLIENT_MASTER', async () => {
      await expect(service.findFolders(clientMasterUser)).rejects.toThrow(ForbiddenException);
    });

    it('returns folders with credentialCount for ADMIN/AGENT', async () => {
      mockPrisma.credentialFolder.findMany.mockResolvedValue([
        { id: 'f1', name: 'Servidores', organizationId: 'org-1', _count: { credentials: 3 }, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const result = await service.findFolders(agentUser);
      expect(result).toEqual([
        expect.objectContaining({ id: 'f1', name: 'Servidores', credentialCount: 3 }),
      ]);
    });
  });

  describe('createFolder', () => {
    it('throws ForbiddenException if user is not ADMIN', async () => {
      await expect(service.createFolder({ name: 'Nova' }, agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('creates a folder and logs CREATE_FOLDER', async () => {
      mockPrisma.credentialFolder.create.mockResolvedValue({ id: 'f1', name: 'Nova', organizationId: 'org-admin' });
      const result = await service.createFolder({ name: 'Nova' }, adminUser, '127.0.0.1');
      expect(result).toEqual({ id: 'f1', name: 'Nova', organizationId: 'org-admin' });
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: CredentialAction.CREATE_FOLDER,
          folderId: 'f1',
          targetName: 'Nova',
          actorId: 'admin-1',
          actorName: 'Ana Admin',
          ipAddress: '127.0.0.1',
        }),
      });
    });
  });

  describe('updateFolder', () => {
    it('throws ForbiddenException if user is not ADMIN', async () => {
      await expect(service.updateFolder('f1', { name: 'X' }, agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if folder does not exist', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue(null);
      await expect(service.updateFolder('missing', { name: 'X' }, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('renames an existing folder', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue({ id: 'f1', name: 'Old' });
      mockPrisma.credentialFolder.update.mockResolvedValue({ id: 'f1', name: 'New' });
      const result = await service.updateFolder('f1', { name: 'New' }, adminUser);
      expect(result).toEqual({ id: 'f1', name: 'New' });
      expect(mockPrisma.credentialFolder.update).toHaveBeenCalledWith({ where: { id: 'f1' }, data: { name: 'New' } });
    });
  });

  describe('removeFolder', () => {
    it('throws ForbiddenException if user is not ADMIN', async () => {
      await expect(service.removeFolder('f1', agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if folder does not exist', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue(null);
      await expect(service.removeFolder('missing', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete a folder that still has credentials', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue({
        id: 'f1',
        name: 'Servidores',
        organizationId: 'org-1',
        _count: { credentials: 2 },
      });
      await expect(service.removeFolder('f1', adminUser)).rejects.toThrow(ConflictException);
      expect(mockPrisma.credentialFolder.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty folder and logs DELETE_FOLDER', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue({
        id: 'f1',
        name: 'Servidores',
        organizationId: 'org-1',
        _count: { credentials: 0 },
      });
      const result = await service.removeFolder('f1', adminUser, '10.0.0.1');
      expect(result).toEqual({ success: true });
      expect(mockPrisma.credentialFolder.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.DELETE_FOLDER, folderId: 'f1', ipAddress: '10.0.0.1' }),
      });
    });
  });

  // -------------------------------------------------------------------
  // Credentials
  // -------------------------------------------------------------------
  describe('findCredentials', () => {
    it('throws ForbiddenException if user is CLIENT', async () => {
      await expect(service.findCredentials({}, clientUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if user is CLIENT_MASTER', async () => {
      await expect(service.findCredentials({}, clientMasterUser)).rejects.toThrow(ForbiddenException);
    });

    it('never includes raw password/username, only hasPassword/hasUsername booleans', async () => {
      mockPrisma.credential.count.mockResolvedValue(1);
      mockPrisma.credential.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Servidor FTP',
          url: null,
          description: null,
          organizationId: 'org-1',
          folderId: null,
          username: 'ftpuser',
          password: 'super-secret',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findCredentials({}, adminUser);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.data[0]).not.toHaveProperty('username');
      expect(result.data[0]).toMatchObject({ id: 'c1', name: 'Servidor FTP', hasUsername: true, hasPassword: true });
      expect(JSON.stringify(result)).not.toContain('super-secret');
    });

    it('paginates using page/limit and returns meta', async () => {
      mockPrisma.credential.count.mockResolvedValue(45);
      mockPrisma.credential.findMany.mockResolvedValue([]);

      const result = await service.findCredentials({ page: '2', limit: '10' }, adminUser);

      expect(mockPrisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta).toEqual({ total: 45, page: 2, limit: 10, totalPages: 5 });
    });

    it('filters by folderId when provided', async () => {
      mockPrisma.credential.findMany.mockResolvedValue([]);
      await service.findCredentials({ folderId: 'f1' }, adminUser);
      expect(mockPrisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ folderId: 'f1' }) }),
      );
    });

    it('filters to credentials without a folder when folderId=root', async () => {
      mockPrisma.credential.findMany.mockResolvedValue([]);
      await service.findCredentials({ folderId: 'root' }, adminUser);
      expect(mockPrisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ folderId: null }) }),
      );
    });

    it('applies a search filter by name', async () => {
      mockPrisma.credential.findMany.mockResolvedValue([]);
      await service.findCredentials({ search: 'vpn' }, adminUser);
      expect(mockPrisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'vpn', mode: 'insensitive' } }),
        }),
      );
    });
  });

  describe('createCredential', () => {
    it('throws ForbiddenException if user is AGENT', async () => {
      await expect(service.createCredential({ name: 'teste', password: 'fake-password-123' }, agentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows ADMIN to create and logs CREATE_CREDENTIAL', async () => {
      mockPrisma.credential.create.mockResolvedValue({ id: 'cred', name: 'teste', organizationId: 'org-admin', folderId: null });
      const result = await service.createCredential({ name: 'teste', password: 'fake-password-123' }, adminUser);
      expect(result).toEqual(
        expect.objectContaining({ id: 'cred', name: 'teste', organizationId: 'org-admin', folderId: null }),
      );
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.CREATE_CREDENTIAL, credentialId: 'cred' }),
      });
    });

    // Regression test for a real leak: Prisma's default `create()` (no
    // select/omit) returns every column, including `password`/`username`,
    // in the very row the caller just submitted. A mock that already
    // strips those fields (like the one above) cannot catch a service that
    // forgets to sanitize — it would pass even with the bug. This mock
    // mirrors what real Prisma actually returns.
    it('never echoes the raw password/username back in the create response (acceptance criterion #1)', async () => {
      mockPrisma.credential.create.mockResolvedValue({
        id: 'cred',
        name: 'teste',
        organizationId: 'org-admin',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
        url: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createCredential(
        { name: 'teste', username: 'root', password: 'fake-password-123' },
        adminUser,
      );

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('username');
      expect(result).toMatchObject({ id: 'cred', hasUsername: true, hasPassword: true });
      expect(JSON.stringify(result)).not.toContain('fake-password-123');
    });

    it('throws NotFoundException when folderId does not exist', async () => {
      mockPrisma.credentialFolder.findUnique.mockResolvedValue(null);
      await expect(
        service.createCredential({ name: 'teste', password: 'fake-password-123', folderId: 'missing' }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCredential', () => {
    it('throws ForbiddenException if user is not ADMIN', async () => {
      await expect(service.updateCredential('c1', { name: 'x' }, agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if credential does not exist', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue(null);
      await expect(service.updateCredential('missing', { name: 'x' }, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('updates the credential and logs UPDATE_CREDENTIAL', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue({ id: 'c1', name: 'Old', organizationId: 'org-1', folderId: null });
      mockPrisma.credential.update.mockResolvedValue({ id: 'c1', name: 'New', organizationId: 'org-1', folderId: null });
      const result = await service.updateCredential('c1', { name: 'New' }, adminUser);
      expect(result).toEqual(expect.objectContaining({ id: 'c1', name: 'New', organizationId: 'org-1', folderId: null }));
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.UPDATE_CREDENTIAL, credentialId: 'c1' }),
      });
    });

    // Regression test for a real leak: Prisma's default `update()` (no
    // select/omit) returns every column, including `password`/`username`,
    // even when the PATCH body never touched them (e.g. renaming a
    // credential or moving it to another folder still echoed the existing
    // secret back in the HTTP response). This mock mirrors what real
    // Prisma actually returns, unlike a mock that pre-strips those fields.
    it('never echoes the raw password/username back in the update response, even on an unrelated rename (acceptance criterion #1)', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Old',
        organizationId: 'org-1',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
      });
      mockPrisma.credential.update.mockResolvedValue({
        id: 'c1',
        name: 'New',
        organizationId: 'org-1',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
        url: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Renaming only — the PATCH body never mentions username/password.
      const result = await service.updateCredential('c1', { name: 'New' }, adminUser);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('username');
      expect(result).toMatchObject({ id: 'c1', name: 'New', hasUsername: true, hasPassword: true });
      expect(JSON.stringify(result)).not.toContain('fake-password-123');
    });
  });

  describe('removeCredential', () => {
    it('throws ForbiddenException if user is CLIENT_MASTER', async () => {
      await expect(service.removeCredential('cred-123', clientMasterUser)).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to remove and logs DELETE_CREDENTIAL', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue({ id: 'cred-123', name: 'Servidor', organizationId: 'org-1', folderId: null });
      await service.removeCredential('cred-123', adminUser);
      expect(mockPrisma.credential.delete).toHaveBeenCalledWith({ where: { id: 'cred-123' } });
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.DELETE_CREDENTIAL, credentialId: 'cred-123' }),
      });
    });
  });

  // -------------------------------------------------------------------
  // Reveal / copy
  // -------------------------------------------------------------------
  describe('reveal', () => {
    it('throws ForbiddenException for CLIENT', async () => {
      await expect(service.reveal('c1', { field: 'password', intent: 'reveal' }, clientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when credential does not exist', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue(null);
      await expect(service.reveal('missing', { field: 'password', intent: 'reveal' }, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reveals the password and logs REVEAL_CREDENTIAL', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Servidor',
        organizationId: 'org-1',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
      });
      const result = await service.reveal('c1', { field: 'password', intent: 'reveal' }, agentUser, '10.0.0.2');
      expect(result).toEqual({ value: 'fake-password-123' });
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.REVEAL_CREDENTIAL, credentialId: 'c1', ipAddress: '10.0.0.2' }),
      });
    });

    it('copying the password logs COPY_PASSWORD (not REVEAL_CREDENTIAL)', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Servidor',
        organizationId: 'org-1',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
      });
      await service.reveal('c1', { field: 'password', intent: 'copy' }, agentUser);
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.COPY_PASSWORD }),
      });
    });

    it('copying the username logs COPY_USERNAME', async () => {
      mockPrisma.credential.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Servidor',
        organizationId: 'org-1',
        folderId: null,
        username: 'root',
        password: 'fake-password-123',
      });
      const result = await service.reveal('c1', { field: 'username', intent: 'copy' }, agentUser);
      expect(result).toEqual({ value: 'root' });
      expect(mockPrisma.credentialAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: CredentialAction.COPY_USERNAME }),
      });
    });
  });

  // -------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------
  describe('findAudit', () => {
    it('throws ForbiddenException if user is not ADMIN', async () => {
      await expect(service.findAudit({}, agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('returns paginated audit entries for ADMIN', async () => {
      mockPrisma.credentialAuditLog.count.mockResolvedValue(1);
      mockPrisma.credentialAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: CredentialAction.REVEAL_CREDENTIAL, targetName: 'Servidor', actorName: 'Ana Admin' },
      ]);
      const result = await service.findAudit({}, adminUser);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('filters by actorId, action and query (targetName)', async () => {
      mockPrisma.credentialAuditLog.findMany.mockResolvedValue([]);
      await service.findAudit({ actorId: 'u1', action: CredentialAction.COPY_PASSWORD, query: 'VPN' }, adminUser);
      expect(mockPrisma.credentialAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorId: 'u1',
            action: CredentialAction.COPY_PASSWORD,
            targetName: { contains: 'VPN', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('filters by date range (from/to)', async () => {
      mockPrisma.credentialAuditLog.findMany.mockResolvedValue([]);
      await service.findAudit({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z' }, adminUser);
      expect(mockPrisma.credentialAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date('2026-01-01T00:00:00.000Z'), lte: new Date('2026-01-31T23:59:59.000Z') },
          }),
        }),
      );
    });
  });
});
