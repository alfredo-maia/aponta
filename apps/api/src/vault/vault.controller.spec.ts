import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const mockVaultService = {
  findFolders: jest.fn(),
  createFolder: jest.fn(),
  updateFolder: jest.fn(),
  removeFolder: jest.fn(),
  findCredentials: jest.fn(),
  createCredential: jest.fn(),
  updateCredential: jest.fn(),
  removeCredential: jest.fn(),
  reveal: jest.fn(),
  findAudit: jest.fn(),
};

describe('VaultController', () => {
  let controller: VaultController;

  const mockUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultController],
      providers: [
        { provide: VaultService, useValue: mockVaultService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<VaultController>(VaultController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * DMTE-128: MANAGE_PASSWORD_VAULT dava a AGENT/AGENT_MASTER (via
   * DEFAULT_PERMISSION_GROUPS) CRUD completo de credenciais + visibilidade
   * da trilha de auditoria, não só leitura/revelação que tinham antes do
   * refactor para PermissionsGuard. Decisão (ver seed.ts): dividir em 3
   * chaves — VIEW_PASSWORD_VAULT (leitura/revelação), MANAGE_PASSWORD_VAULT
   * (agora só escrita) e VIEW_PASSWORD_VAULT_AUDIT (ADMIN-only, igual ao
   * @Roles antigo de findAudit).
   */
  describe('@RequirePermission metadata', () => {
    it('requires VIEW_PASSWORD_VAULT on findFolders', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findFolders)).toEqual([
        'VIEW_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on createFolder', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.createFolder)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on updateFolder', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.updateFolder)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on removeFolder', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.removeFolder)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires VIEW_PASSWORD_VAULT on findCredentials', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findCredentials)).toEqual([
        'VIEW_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on createCredential', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.createCredential)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on updateCredential', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.updateCredential)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires MANAGE_PASSWORD_VAULT on removeCredential', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.removeCredential)).toEqual([
        'MANAGE_PASSWORD_VAULT',
      ]);
    });

    it('requires VIEW_PASSWORD_VAULT on reveal', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.reveal)).toEqual([
        'VIEW_PASSWORD_VAULT',
      ]);
    });

    it('requires VIEW_PASSWORD_VAULT_AUDIT on findAudit', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAudit)).toEqual([
        'VIEW_PASSWORD_VAULT_AUDIT',
      ]);
    });
  });

  describe('delegation', () => {
    it('findFolders delegates to vaultService.findFolders', async () => {
      mockVaultService.findFolders.mockResolvedValue([]);
      await controller.findFolders(mockUser);
      expect(mockVaultService.findFolders).toHaveBeenCalledWith(mockUser);
    });

    it('findAudit delegates to vaultService.findAudit', async () => {
      const query = { page: 1 };
      mockVaultService.findAudit.mockResolvedValue([]);
      await controller.findAudit(query as never, mockUser);
      expect(mockVaultService.findAudit).toHaveBeenCalledWith(query, mockUser);
    });
  });
});
