import { PERMISSION_CATALOG, PERMISSION_KEYS, isValidPermissionKey } from './permission-catalog';

describe('permission-catalog', () => {
  it('has no duplicate keys', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  it('has a non-empty label and category for every entry', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.key).toBeTruthy();
      expect(permission.label).toBeTruthy();
      expect(permission.category).toBeTruthy();
    }
  });

  it('isValidPermissionKey recognizes catalog keys and rejects unknown ones', () => {
    expect(isValidPermissionKey('MANAGE_USERS')).toBe(true);
    expect(isValidPermissionKey('NOT_A_REAL_PERMISSION')).toBe(false);
  });
});
