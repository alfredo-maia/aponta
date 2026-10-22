import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    service = new PermissionsService(mockPrisma as any);
  });

  describe('getEffectivePermissions', () => {
    it('returns the permissions of a PermissionGroup linked directly to the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [
          { permissionGroup: { permissions: ['MANAGE_USERS', 'VIEW_AND_OPEN_TICKETS'] } },
        ],
        technicalGroup: null,
      });

      const result = await service.getEffectivePermissions('user-1');

      expect([...result].sort()).toEqual(['MANAGE_USERS', 'VIEW_AND_OPEN_TICKETS']);
    });

    it('returns the permissions of PermissionGroups linked via the user TechnicalGroup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [],
        technicalGroup: {
          permissionGroupLinks: [
            { permissionGroup: { permissions: ['EDIT_TICKETS'] } },
          ],
        },
      });

      const result = await service.getEffectivePermissions('user-1');

      expect([...result]).toEqual(['EDIT_TICKETS']);
    });

    it('merges direct and technical-group permissions without duplicates', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [
          { permissionGroup: { permissions: ['MANAGE_USERS', 'EDIT_TICKETS'] } },
        ],
        technicalGroup: {
          permissionGroupLinks: [
            { permissionGroup: { permissions: ['EDIT_TICKETS', 'VIEW_AND_OPEN_TICKETS'] } },
          ],
        },
      });

      const result = await service.getEffectivePermissions('user-1');

      expect([...result].sort()).toEqual(
        ['EDIT_TICKETS', 'MANAGE_USERS', 'VIEW_AND_OPEN_TICKETS'].sort(),
      );
    });

    it('returns an empty set when the user has no PermissionGroup or TechnicalGroup link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [],
        technicalGroup: null,
      });

      const result = await service.getEffectivePermissions('user-1');

      expect(result.size).toBe(0);
    });

    it('returns an empty set when the user no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePermissions('ghost');

      expect(result.size).toBe(0);
    });
  });

  describe('hasPermission', () => {
    it('returns true when the user has at least one of the required permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['MANAGE_USERS'] } }],
        technicalGroup: null,
      });

      const result = await service.hasPermission('user-1', 'EDIT_TICKETS', 'MANAGE_USERS');

      expect(result).toBe(true);
    });

    it('returns false when the user has none of the required permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [],
        technicalGroup: null,
      });

      const result = await service.hasPermission('user-1', 'MANAGE_USERS');

      expect(result).toBe(false);
    });
  });
});
