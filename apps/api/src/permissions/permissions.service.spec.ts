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

  describe('canViewTicketValues (DMTE-464)', () => {
    it('é verdadeiro quando um grupo direto tem VIEW_TICKET_VALUES', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['VIEW_TICKET_VALUES'] } }],
        technicalGroup: null,
      });
      await expect(service.canViewTicketValues('user-1')).resolves.toBe(true);
    });

    it('é verdadeiro quando o grupo técnico do usuário tem a permissão', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [],
        technicalGroup: { permissionGroupLinks: [{ permissionGroup: { permissions: ['VIEW_TICKET_VALUES'] } }] },
      });
      await expect(service.canViewTicketValues('user-1')).resolves.toBe(true);
    });

    it('é falso sem a permissão, mesmo com outras permissões', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['MANAGE_USERS'] } }],
        technicalGroup: null,
      });
      await expect(service.canViewTicketValues('user-1')).resolves.toBe(false);
    });
  });

  describe('canEditWorklogStartTime (DMTE-462 T1)', () => {
    it('AC-02: é verdadeiro quando um grupo direto tem EDIT_WORKLOG_START_TIME', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['EDIT_WORKLOG_START_TIME'] } }],
        technicalGroup: null,
      });
      await expect(service.canEditWorklogStartTime('user-1')).resolves.toBe(true);
    });

    it('AC-02: é verdadeiro quando o grupo técnico do usuário tem a permissão', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [],
        technicalGroup: { permissionGroupLinks: [{ permissionGroup: { permissions: ['EDIT_WORKLOG_START_TIME'] } }] },
      });
      await expect(service.canEditWorklogStartTime('user-1')).resolves.toBe(true);
    });

    it('AC-01: é falso sem a permissão, mesmo com outras', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['VIEW_TICKET_VALUES'] } }],
        technicalGroup: null,
      });
      await expect(service.canEditWorklogStartTime('user-1')).resolves.toBe(false);
    });
  });

  describe('canReleaseWorklogWithoutSchedule (DMTE-462 T2)', () => {
    it('AC-12: é verdadeiro com a chave num grupo direto e falso sem ela', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['RELEASE_WORKLOG_WITHOUT_SCHEDULE'] } }],
        technicalGroup: null,
      });
      await expect(service.canReleaseWorklogWithoutSchedule('user-1')).resolves.toBe(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        permissionGroupLinks: [{ permissionGroup: { permissions: ['EDIT_WORKLOG_START_TIME'] } }],
        technicalGroup: null,
      });
      await expect(service.canReleaseWorklogWithoutSchedule('user-1')).resolves.toBe(false);
    });
  });
});
